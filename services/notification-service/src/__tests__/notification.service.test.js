'use strict';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

jest.mock('../config/prisma', () => ({
  notification: {
    create: jest.fn(),
  },
}));

jest.mock('../services/email.service', () => ({
  SendTaskAssigned: jest.fn().mockResolvedValue(true),
  SendTaskApproved: jest.fn().mockResolvedValue(true),
  SendTaskRejected: jest.fn().mockResolvedValue(true),
}));

jest.mock('@pms/constants', () => ({
  NOTIFICATION_TYPES: {
    TASK_ASSIGNED:       'TASK_ASSIGNED',
    TASK_STATUS_CHANGED: 'TASK_STATUS_CHANGED',
    TASK_APPROVED:       'TASK_APPROVED',
    TASK_REJECTED:       'TASK_REJECTED',
    PROJECT_MEMBER_ADDED:'PROJECT_MEMBER_ADDED',
    WORKFLOW_SLA_BREACHED:'WORKFLOW_SLA_BREACHED',
    MEETING_CREATED:     'MEETING_CREATED',
  },
  TOPICS: {},
}));

// ---------------------------------------------------------------------------

const prisma = require('../config/prisma');
const EmailService = require('../services/email.service');
const { DispatchNotification } = require('../services/notification.service');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeP2002Error = () => {
  const err = new Error('Unique constraint failed');
  err.code = 'P2002';
  return err;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NotificationService.DispatchNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.warn.mockRestore();
    console.error.mockRestore();
  });

  // -------------------------------------------------------------------------
  // TASK_ASSIGNED
  // -------------------------------------------------------------------------

  describe('TASK_ASSIGNED', () => {
    it('creates a notification for each assignee and sends an email', async () => {
      prisma.notification.create.mockResolvedValue({});

      await DispatchNotification('evt-1', 'pms.task.events', {
        type: 'TASK_ASSIGNED',
        assigneeIds: ['user-a', 'user-b'],
        taskId: 'task-1',
        taskTitle: 'Fix the bug',
        recipientEmail: 'a@test.com',
        projectName: 'TestProject',
      });

      // One create call per assignee (eventId is keyed as `evt-1:user-a`, etc.)
      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'TASK_ASSIGNED',
            userId: 'user-a',
          }),
        })
      );
      expect(EmailService.SendTaskAssigned).toHaveBeenCalledTimes(1);
    });

    it('skips creation and warns when assigneeIds is empty', async () => {
      await DispatchNotification('evt-2', 'pms.task.events', {
        type: 'TASK_ASSIGNED',
        assigneeIds: [],
        taskId: 'task-1',
        taskTitle: 'Task',
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    });

    it('skips creation and warns when assigneeIds is not provided', async () => {
      await DispatchNotification('evt-3', 'pms.task.events', {
        type: 'TASK_ASSIGNED',
        taskId: 'task-1',
        taskTitle: 'Task',
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // TASK_APPROVED
  // -------------------------------------------------------------------------

  describe('TASK_APPROVED', () => {
    it('creates notifications for all assignees and sends an email', async () => {
      prisma.notification.create.mockResolvedValue({});

      await DispatchNotification('evt-10', 'pms.task.events', {
        type: 'TASK_APPROVED',
        assigneeIds: ['user-c', 'user-d'],
        taskId: 'task-2',
        taskTitle: 'Design review',
        recipientEmail: 'c@test.com',
      });

      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'TASK_APPROVED' }),
        })
      );
      expect(EmailService.SendTaskApproved).toHaveBeenCalledTimes(1);
    });

    it('warns and skips when assigneeIds is empty', async () => {
      await DispatchNotification('evt-11', 'pms.task.events', {
        type: 'TASK_APPROVED',
        assigneeIds: [],
        taskId: 'task-2',
        taskTitle: 'Design review',
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // TASK_REJECTED
  // -------------------------------------------------------------------------

  describe('TASK_REJECTED', () => {
    it('creates a notification for the rejectTo user and sends an email', async () => {
      prisma.notification.create.mockResolvedValue({});

      await DispatchNotification('evt-20', 'pms.task.events', {
        type: 'TASK_REJECTED',
        rejectTo: 'user-e',
        taskId: 'task-3',
        taskTitle: 'Bad code',
        reason: 'Does not pass tests',
        recipientEmail: 'e@test.com',
      });

      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'TASK_REJECTED',
            userId: 'user-e',
          }),
        })
      );
      expect(EmailService.SendTaskRejected).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // WORKFLOW_SLA_BREACHED
  // -------------------------------------------------------------------------

  describe('WORKFLOW_SLA_BREACHED', () => {
    it('creates a notification for the project lead', async () => {
      prisma.notification.create.mockResolvedValue({});

      await DispatchNotification('evt-30', 'pms.workflow.events', {
        type: 'WORKFLOW_SLA_BREACHED',
        projectLeadId: 'lead-1',
        workflowName: 'Approval Flow',
        projectName: 'Alpha',
        projectId: 'proj-1',
      });

      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'WORKFLOW_SLA_BREACHED',
            userId: 'lead-1',
          }),
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // MEETING_CREATED
  // -------------------------------------------------------------------------

  describe('MEETING_CREATED', () => {
    it('creates a notification for each participant', async () => {
      prisma.notification.create.mockResolvedValue({});

      await DispatchNotification('evt-40', 'pms.meeting.events', {
        type: 'MEETING_CREATED',
        participantIds: ['user-x', 'user-y', 'user-z'],
        meetingId: 'meeting-1',
        meetingTitle: 'Kickoff',
      });

      expect(prisma.notification.create).toHaveBeenCalledTimes(3);
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'MEETING_CREATED' }),
        })
      );
    });

    it('warns and skips when participantIds is empty', async () => {
      await DispatchNotification('evt-41', 'pms.meeting.events', {
        type: 'MEETING_CREATED',
        participantIds: [],
        meetingId: 'meeting-2',
        meetingTitle: 'Empty meeting',
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // PROJECT_MEMBER_ADDED
  // -------------------------------------------------------------------------

  describe('PROJECT_MEMBER_ADDED', () => {
    it('creates a notification for the added user', async () => {
      prisma.notification.create.mockResolvedValue({});

      await DispatchNotification('evt-50', 'pms.project.events', {
        type: 'PROJECT_MEMBER_ADDED',
        userId: 'user-f',
        projectName: 'Gamma',
        projectId: 'proj-2',
      });

      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'PROJECT_MEMBER_ADDED',
            userId: 'user-f',
          }),
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // Deduplication — P2002 swallowed
  // -------------------------------------------------------------------------

  describe('deduplication (P2002)', () => {
    it('swallows P2002 and does not throw when a duplicate notification exists', async () => {
      prisma.notification.create.mockRejectedValue(makeP2002Error());

      await expect(
        DispatchNotification('evt-60', 'pms.task.events', {
          type: 'TASK_REJECTED',
          rejectTo: 'user-g',
          taskId: 'task-4',
          taskTitle: 'Dup test',
          reason: 'Duplicate',
          recipientEmail: 'g@test.com',
        })
      ).resolves.toBeUndefined();

      expect(console.warn).toHaveBeenCalled();
    });

    it('does not swallow non-P2002 errors in _createOne — propagates them', async () => {
      const dbError = new Error('Connection refused');
      dbError.code = 'P9999';
      prisma.notification.create.mockRejectedValue(dbError);

      // DispatchNotification catches ALL errors internally and logs them,
      // so it resolves rather than rejects. But the inner _createBatch throws,
      // which bubbles to DispatchNotification's catch — logged, not re-thrown.
      await expect(
        DispatchNotification('evt-61', 'pms.task.events', {
          type: 'TASK_ASSIGNED',
          assigneeIds: ['user-h'],
          taskId: 'task-5',
          taskTitle: 'Error task',
        })
      ).resolves.toBeUndefined();

      expect(console.error).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Batch creation with partial failures
  // -------------------------------------------------------------------------

  describe('batch creation with partial failures', () => {
    it('logs failures for failed users but still processes successful ones', async () => {
      // First call succeeds, second call fails with a non-P2002 error
      const failErr = new Error('DB timeout');
      failErr.code = 'ETIMEDOUT';

      prisma.notification.create
        .mockResolvedValueOnce({}) // user-a succeeds
        .mockRejectedValueOnce(failErr); // user-b fails

      // _createBatch uses Promise.allSettled — partial failures throw an Error
      // after logging. DispatchNotification catches that and logs console.error.
      await DispatchNotification('evt-70', 'pms.meeting.events', {
        type: 'MEETING_CREATED',
        participantIds: ['user-a', 'user-b'],
        meetingId: 'meeting-3',
        meetingTitle: 'Partial fail',
      });

      // Two create attempts made
      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
      // Error logged for the batch failure
      expect(console.error).toHaveBeenCalled();
    });

    it('resolves without throwing when all batch notifications fail with P2002', async () => {
      prisma.notification.create.mockRejectedValue(makeP2002Error());

      await expect(
        DispatchNotification('evt-71', 'pms.task.events', {
          type: 'TASK_ASSIGNED',
          assigneeIds: ['user-i', 'user-j'],
          taskId: 'task-6',
          taskTitle: 'All dup',
        })
      ).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Unknown event type
  // -------------------------------------------------------------------------

  describe('unknown event type', () => {
    it('warns and does not throw for an unrecognised event type', async () => {
      await expect(
        DispatchNotification('evt-80', 'pms.unknown.events', {
          type: 'TOTALLY_UNKNOWN_TYPE',
          someData: true,
        })
      ).resolves.toBeUndefined();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('TOTALLY_UNKNOWN_TYPE')
      );
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });
});
