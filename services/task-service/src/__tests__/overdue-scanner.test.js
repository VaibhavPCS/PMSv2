'use strict';

jest.mock('../config/prisma', () => ({
  task: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  taskHistory: {
    create: jest.fn(),
  },
}));

jest.mock('../events/publishers', () => ({
  PublishTaskOverdue: jest.fn().mockResolvedValue(undefined),
}));

const prisma = require('../config/prisma');
const { PublishTaskOverdue } = require('../events/publishers');
const { ScanOnce } = require('../engine/overdue-scanner');

const NOW = new Date('2026-05-30T12:00:00.000Z');

const makeTask = (overrides = {}) => ({
  id: 'task-1',
  projectId: 'proj-1',
  workspaceId: 'ws-1',
  status: 'pending',
  dueDate: new Date('2026-05-01T00:00:00.000Z'),
  isActive: true,
  assignees: [{ userId: 'u1' }, { userId: 'u2' }],
  ...overrides,
});

describe('overdue-scanner ScanOnce', () => {
  beforeEach(() => jest.clearAllMocks());

  it('flips an eligible overdue task and publishes TASK_OVERDUE', async () => {
    prisma.task.findMany.mockResolvedValue([makeTask()]);
    prisma.task.updateMany.mockResolvedValue({ count: 1 });
    prisma.taskHistory.create.mockResolvedValue({});

    const flipped = await ScanOnce(NOW);

    expect(flipped).toBe(1);
    expect(prisma.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'task-1', status: 'pending' },
        data: { status: 'overdue' },
      })
    );
    expect(prisma.taskHistory.create).toHaveBeenCalledTimes(1);
    expect(PublishTaskOverdue).toHaveBeenCalledWith(
      'task-1', 'proj-1', 'ws-1', ['u1', 'u2'], expect.any(String)
    );
  });

  it('skips a task already claimed by another replica (updateMany count 0)', async () => {
    prisma.task.findMany.mockResolvedValue([makeTask()]);
    prisma.task.updateMany.mockResolvedValue({ count: 0 });

    const flipped = await ScanOnce(NOW);

    expect(flipped).toBe(0);
    expect(prisma.taskHistory.create).not.toHaveBeenCalled();
    expect(PublishTaskOverdue).not.toHaveBeenCalled();
  });

  it('queries only active, past-due, non-terminal tasks', async () => {
    prisma.task.findMany.mockResolvedValue([]);

    await ScanOnce(NOW);

    const where = prisma.task.findMany.mock.calls[0][0].where;
    expect(where.isActive).toBe(true);
    expect(where.dueDate).toEqual({ lt: NOW });
    expect(where.status.notIn).toEqual(
      expect.arrayContaining(['completed', 'approved', 'rejected', 'overdue'])
    );
  });

  it('continues processing when publishing fails', async () => {
    prisma.task.findMany.mockResolvedValue([makeTask(), makeTask({ id: 'task-2' })]);
    prisma.task.updateMany.mockResolvedValue({ count: 1 });
    prisma.taskHistory.create.mockResolvedValue({});
    PublishTaskOverdue.mockRejectedValueOnce(new Error('kafka down'));

    const flipped = await ScanOnce(NOW);

    expect(flipped).toBe(2);
  });
});
