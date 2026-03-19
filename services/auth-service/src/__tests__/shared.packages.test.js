// ─── Phase 0 — Shared Package Tests ──────────────────────────────────────────
// Tests @pms/constants, @pms/error-handler, and @pms/validators.
// Run from auth-service: npm test

const { APIError, CatchAsync }              = require('@pms/error-handler');
const { ROLES, TOPICS, TASK_STATUS }        = require('@pms/constants');
const { ValidateRequest,
        RegisterSchema,
        CreateWorkspaceSchema }             = require('@pms/validators');

// ─── @pms/constants ───────────────────────────────────────────────────────────

describe('@pms/constants — ROLES', () => {
  it('exports all five workspace roles', () => {
    expect(ROLES.OWNER).toBe('owner');
    expect(ROLES.ADMIN).toBe('admin');
    expect(ROLES.PROJECT_HEAD).toBe('project_head');
    expect(ROLES.TEAM_LEAD).toBe('team_lead');
    expect(ROLES.MEMBER).toBe('member');
  });
});

describe('@pms/constants — TOPICS', () => {
  it('exports all required Kafka topic names', () => {
    expect(TOPICS.AUTH_EVENTS).toBe('pms.auth.events');
    expect(TOPICS.WORKSPACE_EVENTS).toBe('pms.workspace.events');
    expect(TOPICS.TASK_EVENTS).toBe('pms.task.events');
    expect(TOPICS.NOTIFICATION_EVENTS).toBe('pms.notification.events');
  });
});

describe('@pms/constants — TASK_STATUS', () => {
  it('exports pending and completed', () => {
    expect(TASK_STATUS.PENDING).toBe('pending');
    expect(TASK_STATUS.COMPLETED).toBe('completed');
    expect(TASK_STATUS.IN_PROGRESS).toBe('in_progress');
  });
});

// ─── @pms/error-handler — APIError ────────────────────────────────────────────

describe('@pms/error-handler — APIError', () => {
  it('sets statusCode, message, and isOperational=true', () => {
    const err = new APIError(404, 'Not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.isOperational).toBe(true);
  });

  it('sets status="fail" for 4xx errors', () => {
    expect(new APIError(400, 'Bad').status).toBe('fail');
    expect(new APIError(403, 'Forbidden').status).toBe('fail');
    expect(new APIError(404, 'Not found').status).toBe('fail');
  });

  it('sets status="error" for 5xx errors', () => {
    expect(new APIError(500, 'Server error').status).toBe('error');
  });

  it('is an instance of Error', () => {
    expect(new APIError(400, 'Bad')).toBeInstanceOf(Error);
  });
});

// ─── @pms/error-handler — CatchAsync ─────────────────────────────────────────

describe('@pms/error-handler — CatchAsync', () => {
  it('forwards thrown errors to next(err)', async () => {
    const boom    = new Error('boom');
    const handler = CatchAsync(async () => { throw boom; });
    const next    = jest.fn();

    await handler({}, {}, next);

    expect(next).toHaveBeenCalledWith(boom);
  });

  it('does not call next with an error on success', async () => {
    const res     = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const handler = CatchAsync(async (req, res) => {
      res.status(200).json({ status: 'success' });
    });
    const next = jest.fn();

    await handler({}, res, next);

    expect(next).not.toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─── @pms/validators — RegisterSchema ────────────────────────────────────────

describe('@pms/validators — RegisterSchema', () => {
  const VALID = { name: 'Alice', email: 'alice@example.com', password: 'SecurePass1!' };

  it('accepts a valid registration payload', () => {
    expect(RegisterSchema.safeParse(VALID).success).toBe(true);
  });

  it('rejects name shorter than 3 characters', () => {
    expect(RegisterSchema.safeParse({ ...VALID, name: 'Al' }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(RegisterSchema.safeParse({ ...VALID, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects a password with fewer than 12 characters', () => {
    expect(RegisterSchema.safeParse({ ...VALID, password: 'Short1!' }).success).toBe(false);
  });

  it('rejects a password with no special character', () => {
    expect(RegisterSchema.safeParse({ ...VALID, password: 'SecurePass11' }).success).toBe(false);
  });

  it('rejects a password with no uppercase letter', () => {
    expect(RegisterSchema.safeParse({ ...VALID, password: 'securepass1!' }).success).toBe(false);
  });

  it('rejects a password with no number', () => {
    expect(RegisterSchema.safeParse({ ...VALID, password: 'SecurePasss!' }).success).toBe(false);
  });
});

// ─── @pms/validators — CreateWorkspaceSchema ─────────────────────────────────

describe('@pms/validators — CreateWorkspaceSchema', () => {
  it('accepts a valid workspace payload', () => {
    expect(CreateWorkspaceSchema.safeParse({ name: 'Acme', color: '#6366f1' }).success).toBe(true);
  });

  it('accepts an optional description', () => {
    const r = CreateWorkspaceSchema.safeParse({ name: 'Acme', description: 'Main ws', color: '#fff' });
    expect(r.success).toBe(true);
  });

  it('rejects missing name', () => {
    expect(CreateWorkspaceSchema.safeParse({ color: '#6366f1' }).success).toBe(false);
  });

  it('rejects empty name string', () => {
    expect(CreateWorkspaceSchema.safeParse({ name: '', color: '#6366f1' }).success).toBe(false);
  });

  it('rejects missing color', () => {
    expect(CreateWorkspaceSchema.safeParse({ name: 'Acme' }).success).toBe(false);
  });
});

// ─── @pms/validators — ValidateRequest middleware ────────────────────────────

describe('@pms/validators — ValidateRequest middleware', () => {
  const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
  };

  it('calls next() and coerces req.body on a valid payload', () => {
    const middleware = ValidateRequest(CreateWorkspaceSchema);
    const req  = { body: { name: 'Acme Corp', color: '#abc123' } };
    const res  = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'Acme Corp', color: '#abc123' });
  });

  it('returns 422 and does NOT call next on an invalid payload', () => {
    const middleware = ValidateRequest(CreateWorkspaceSchema);
    const req  = { body: { color: '#abc123' } }; // name missing
    const res  = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'fail', message: expect.stringContaining('Validation failed') })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
