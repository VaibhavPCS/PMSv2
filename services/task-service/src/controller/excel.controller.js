const { CatchAsync, APIError } = require('@pms/error-handler');
const ExcelService = require('../services/excel.service');

// POST /api/v1/imports/tasks/parse-preview  (multipart: file)
const ParsePreview = CatchAsync(async (req, res) => {
    if (!req.file) throw new APIError(400, 'No spreadsheet uploaded (field name: file)');
    const preview = ExcelService.ParsePreview(req.file.buffer);
    res.status(200).json({ status: 'success', data: preview });
});

// POST /api/v1/imports/tasks  (json: { projectId, workspaceId, projectHeadId, rows: [{title,...}] })
const ImportTasks = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const { projectId, workspaceId, projectHeadId, rows } = req.body;

    if (typeof projectId !== 'string' || !projectId.trim()) throw new APIError(400, 'projectId is required');
    if (typeof workspaceId !== 'string' || !workspaceId.trim()) throw new APIError(400, 'workspaceId is required');
    if (!Array.isArray(rows) || rows.length === 0) throw new APIError(400, 'rows must be a non-empty array');

    const result = await ExcelService.BulkImport(userId, { projectId, workspaceId, projectHeadId, rows });
    res.status(201).json({ status: 'success', data: result });
});

module.exports = { ParsePreview, ImportTasks };
