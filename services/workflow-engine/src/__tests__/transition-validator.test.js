'use strict';

/**
 * Pure unit tests for ValidateTransition.
 * No HTTP, no supertest — call the function directly.
 */

const { ValidateTransition } = require('../engine/transition-validator');

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const SIMPLE_DEFINITION = {
  initialStage: 'todo',
  terminalStages: ['done'],
  stages: [
    { id: 'todo',        label: 'Todo'        },
    { id: 'in-progress', label: 'In Progress' },
    { id: 'review',      label: 'Review'      },
    { id: 'deployed',    label: 'Deployed'    },
    { id: 'done',        label: 'Done'        },
  ],
  transitions: [
    {
      from:         'todo',
      to:           'in-progress',
      label:        'Start',
      allowedRoles: ['admin', 'member'],
    },
    {
      from:               'in-progress',
      to:                 'done',
      label:              'Complete',
      allowedRoles:       ['admin', 'member'],
      requiresNote:       true,
      requiresAttachment: false,
    },
    {
      from:               'in-progress',
      to:                 'review',
      label:              'Submit for Review',
      allowedRoles:       ['member'],
      requiresAttachment: true,
    },
    {
      from:                  'review',
      to:                    'done',
      label:                 'Approve',
      allowedRoles:          ['admin'],
      requiresReferenceLink: true,
    },
    {
      from:          'in-progress',
      to:            'deployed',
      label:         'Auto-deploy',
      allowedRoles:  ['admin'],
      githubTrigger: 'pr_merged',
    },
  ],
};

const validPayload = (overrides = {}) => ({
  note:          null,
  attachmentUrl: null,
  referenceLink: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// describe: ValidateTransition
// ---------------------------------------------------------------------------

describe('ValidateTransition', () => {

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  describe('happy path', () => {
    it('returns the matched transition object for a valid role and transition', () => {
      const result = ValidateTransition(
        SIMPLE_DEFINITION,
        'todo',
        'in-progress',
        'admin',
        validPayload(),
        'manual',
      );

      expect(result).toMatchObject({
        from:  'todo',
        to:    'in-progress',
        label: 'Start',
      });
    });

    it('succeeds when requiresNote is true and note is supplied', () => {
      const result = ValidateTransition(
        SIMPLE_DEFINITION,
        'in-progress',
        'done',
        'admin',
        validPayload({ note: 'Looks good' }),
        'manual',
      );

      expect(result.label).toBe('Complete');
    });

    it('succeeds when requiresAttachment is true and attachmentUrl is supplied', () => {
      const result = ValidateTransition(
        SIMPLE_DEFINITION,
        'in-progress',
        'review',
        'member',
        validPayload({ attachmentUrl: 'https://example.com/file.pdf' }),
        'manual',
      );

      expect(result.label).toBe('Submit for Review');
    });

    it('succeeds when requiresReferenceLink is true and referenceLink is supplied', () => {
      const result = ValidateTransition(
        SIMPLE_DEFINITION,
        'review',
        'done',
        'admin',
        validPayload({ referenceLink: 'https://github.com/pr/1' }),
        'manual',
      );

      expect(result.label).toBe('Approve');
    });

    it('succeeds for a github-triggered transition when triggeredBy is github_webhook', () => {
      const result = ValidateTransition(
        SIMPLE_DEFINITION,
        'in-progress',
        'deployed',
        'admin',
        validPayload(),
        'github_webhook',
      );

      expect(result.label).toBe('Auto-deploy');
    });

    it('allows a second role listed in allowedRoles to perform the transition', () => {
      const result = ValidateTransition(
        SIMPLE_DEFINITION,
        'todo',
        'in-progress',
        'member',
        validPayload(),
        'manual',
      );

      expect(result).toMatchObject({ from: 'todo', to: 'in-progress' });
    });
  });

  // -------------------------------------------------------------------------
  // No transition defined (400)
  // -------------------------------------------------------------------------

  describe('no transition defined', () => {
    it('throws 400 when no transition exists from currentStage to toStage', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'todo',
          'done',          // skipping stages — no such transition
          'admin',
          validPayload(),
          'manual',
        ),
      ).toThrow(expect.objectContaining({ statusCode: 400 }));
    });

    it('includes the stage names in the error message', () => {
      let caught;
      try {
        ValidateTransition(SIMPLE_DEFINITION, 'todo', 'done', 'admin', validPayload(), 'manual');
      } catch (e) {
        caught = e;
      }

      expect(caught.message).toMatch(/todo/);
      expect(caught.message).toMatch(/done/);
    });

    it('throws 400 when transitioning from a stage that does not exist in the definition', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'nonexistent-stage',
          'in-progress',
          'admin',
          validPayload(),
          'manual',
        ),
      ).toThrow(expect.objectContaining({ statusCode: 400 }));
    });

    it('throws 400 when toStage does not exist in the definition', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'todo',
          'ghost-stage',
          'admin',
          validPayload(),
          'manual',
        ),
      ).toThrow(expect.objectContaining({ statusCode: 400 }));
    });
  });

  // -------------------------------------------------------------------------
  // Wrong role (403)
  // -------------------------------------------------------------------------

  describe('role enforcement', () => {
    it('throws 403 when the user role is not in allowedRoles', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'todo',
          'in-progress',
          'qa',            // 'qa' is not in ['admin', 'member']
          validPayload(),
          'manual',
        ),
      ).toThrow(expect.objectContaining({ statusCode: 403 }));
    });

    it('throws 403 for an empty-string role', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'todo',
          'in-progress',
          '',
          validPayload(),
          'manual',
        ),
      ).toThrow(expect.objectContaining({ statusCode: 403 }));
    });

    it('throws 403 for an undefined role', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'todo',
          'in-progress',
          undefined,
          validPayload(),
          'manual',
        ),
      ).toThrow(expect.objectContaining({ statusCode: 403 }));
    });
  });

  // -------------------------------------------------------------------------
  // GitHub-only transitions blocked by human triggeredBy
  // -------------------------------------------------------------------------

  describe('githubTrigger enforcement', () => {
    it('throws 400 when a github-only transition is triggered manually', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'in-progress',
          'deployed',
          'admin',
          validPayload(),
          'manual',           // not 'github_webhook'
        ),
      ).toThrow(expect.objectContaining({ statusCode: 400 }));
    });

    it('throws 400 when triggeredBy is an arbitrary string that is not github_webhook', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'in-progress',
          'deployed',
          'admin',
          validPayload(),
          'cron',
        ),
      ).toThrow(expect.objectContaining({ statusCode: 400 }));
    });

    it('throws 400 when triggeredBy is undefined for a github-trigger transition', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'in-progress',
          'deployed',
          'admin',
          validPayload(),
          undefined,
        ),
      ).toThrow(expect.objectContaining({ statusCode: 400 }));
    });
  });

  // -------------------------------------------------------------------------
  // requiresNote validation
  // -------------------------------------------------------------------------

  describe('requiresNote validation', () => {
    it('throws 400 when requiresNote is true and note is missing', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'in-progress',
          'done',
          'admin',
          validPayload({ note: undefined }),
          'manual',
        ),
      ).toThrow(expect.objectContaining({ statusCode: 400 }));
    });

    it('throws 400 when requiresNote is true and note is null', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'in-progress',
          'done',
          'admin',
          validPayload({ note: null }),
          'manual',
        ),
      ).toThrow(expect.objectContaining({ statusCode: 400 }));
    });

    it('throws 400 when requiresNote is true and note is an empty string', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'in-progress',
          'done',
          'admin',
          validPayload({ note: '   ' }),
          'manual',
        ),
      ).toThrow(expect.objectContaining({ statusCode: 400 }));
    });
  });

  // -------------------------------------------------------------------------
  // requiresAttachment validation
  // -------------------------------------------------------------------------

  describe('requiresAttachment validation', () => {
    it('throws 400 when requiresAttachment is true and attachmentUrl is missing', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'in-progress',
          'review',
          'member',
          validPayload({ attachmentUrl: undefined }),
          'manual',
        ),
      ).toThrow(expect.objectContaining({ statusCode: 400 }));
    });

    it('throws 400 when requiresAttachment is true and attachmentUrl is null', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'in-progress',
          'review',
          'member',
          validPayload({ attachmentUrl: null }),
          'manual',
        ),
      ).toThrow(expect.objectContaining({ statusCode: 400 }));
    });

    it('throws 400 when requiresAttachment is true and attachmentUrl is whitespace', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'in-progress',
          'review',
          'member',
          validPayload({ attachmentUrl: '   ' }),
          'manual',
        ),
      ).toThrow(expect.objectContaining({ statusCode: 400 }));
    });
  });

  // -------------------------------------------------------------------------
  // requiresReferenceLink validation
  // -------------------------------------------------------------------------

  describe('requiresReferenceLink validation', () => {
    it('throws 400 when requiresReferenceLink is true and referenceLink is missing', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'review',
          'done',
          'admin',
          validPayload({ referenceLink: undefined }),
          'manual',
        ),
      ).toThrow(expect.objectContaining({ statusCode: 400 }));
    });

    it('throws 400 when requiresReferenceLink is true and referenceLink is empty string', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'review',
          'done',
          'admin',
          validPayload({ referenceLink: '' }),
          'manual',
        ),
      ).toThrow(expect.objectContaining({ statusCode: 400 }));
    });
  });

  // -------------------------------------------------------------------------
  // Null / missing payload guard
  // -------------------------------------------------------------------------

  describe('null payload guard', () => {
    it('throws 400 when payload itself is null', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'todo',
          'in-progress',
          'admin',
          null,
          'manual',
        ),
      ).toThrow(expect.objectContaining({ statusCode: 400 }));
    });

    it('throws 400 when payload is undefined', () => {
      expect(() =>
        ValidateTransition(
          SIMPLE_DEFINITION,
          'todo',
          'in-progress',
          'admin',
          undefined,
          'manual',
        ),
      ).toThrow(expect.objectContaining({ statusCode: 400 }));
    });
  });
});
