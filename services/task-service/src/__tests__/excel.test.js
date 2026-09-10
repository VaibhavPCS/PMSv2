'use strict';

// Control what the spreadsheet parser yields, so we test our validation logic
// without depending on a real .xlsx binary.
let MOCK_ROWS = [];
jest.mock('xlsx', () => ({
  read: jest.fn(() => ({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } })),
  utils: { sheet_to_json: jest.fn(() => MOCK_ROWS) },
}));

jest.mock('../services/task.service', () => ({
  CreateTask: jest.fn(),
}));

const TaskService = require('../services/task.service');
const ExcelService = require('../services/excel.service');

const setRows = (rows) => { MOCK_ROWS = rows; };

describe('excel.service ParsePreview', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks a fully-specified row as valid', () => {
    setRows([{ title: 'Task A', description: 'd', priority: 'high', dueDate: '2026-07-01', assignees: 'u1,u2' }]);

    const out = ExcelService.ParsePreview(Buffer.from('x'));

    expect(out.summary).toEqual({ total: 1, valid: 1, invalid: 0 });
    expect(out.rows[0].valid).toBe(true);
    expect(out.rows[0].data.assignees).toEqual(['u1', 'u2']);
    expect(out.rows[0].data.priority).toBe('high');
  });

  it('flags missing title, bad priority, missing dueDate, no assignees', () => {
    setRows([{ title: '', priority: 'bogus', dueDate: 'not-a-date', assignees: '' }]);

    const out = ExcelService.ParsePreview(Buffer.from('x'));

    expect(out.rows[0].valid).toBe(false);
    expect(out.rows[0].errors).toEqual(expect.arrayContaining([
      'title is required',
      expect.stringContaining('priority must be one of'),
      'dueDate is missing or invalid',
      'at least one assignee is required',
    ]));
  });

  it('matches headers case-insensitively and splits assignees on commas/spaces', () => {
    setRows([{ Title: 'T', Priority: 'LOW', 'Due Date': '2026-08-01', Assignees: 'a; b  c' }]);

    const out = ExcelService.ParsePreview(Buffer.from('x'));

    expect(out.rows[0].valid).toBe(true);
    expect(out.rows[0].data.assignees).toEqual(['a', 'b', 'c']);
  });

  it('throws 400 when there are no data rows', () => {
    setRows([]);
    expect(() => ExcelService.ParsePreview(Buffer.from('x'))).toThrow(/no data rows/i);
  });
});

describe('excel.service BulkImport', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a task per row and reports successes/failures', async () => {
    TaskService.CreateTask
      .mockResolvedValueOnce({ id: 't1' })
      .mockRejectedValueOnce(new Error('assignee not in project'));

    const rows = [
      { title: 'A', priority: 'high', dueDate: '2026-07-01', assignees: ['u1'] },
      { title: 'B', priority: 'low', dueDate: '2026-07-02', assignees: ['u2'] },
    ];

    const out = await ExcelService.BulkImport('user-1', { projectId: 'p1', workspaceId: 'w1', rows });

    expect(out.summary).toEqual({ total: 2, created: 1, failed: 1 });
    expect(out.results[0]).toEqual({ index: 0, success: true, taskId: 't1' });
    expect(out.results[1].success).toBe(false);
    expect(TaskService.CreateTask).toHaveBeenCalledTimes(2);
  });

  it('throws 400 when rows is empty', async () => {
    await expect(
      ExcelService.BulkImport('user-1', { projectId: 'p1', workspaceId: 'w1', rows: [] })
    ).rejects.toThrow(/no rows/i);
  });
});
