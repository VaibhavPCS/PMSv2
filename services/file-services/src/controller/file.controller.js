const { CatchAsync, APIError } = require('@pms/error-handler');
const FileService = require('../services/file.service');

const UploadFile = CatchAsync(async (req, res) => {
    if (!req.file) throw new APIError(400, 'No file uploaded');
    const userId = req.session.getUserId();
    const { workspaceId, entityType, entityId } = req.body;

    if (typeof workspaceId !== 'string' || !workspaceId.trim()) throw new APIError(400, 'workspaceId is required');
    if (typeof entityType !== 'string' || !entityType.trim()) throw new APIError(400, 'entityType is required');
    if (typeof entityId !== 'string' || !entityId.trim()) throw new APIError(400, 'entityId is required');

    const record = await FileService.UploadFile(userId, workspaceId, entityType, entityId, req.file);
    res.status(201).json({ status: 'success', data: record });
});

const GetFileUrl = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const url = await FileService.GetFileUrl(req.params.id, userId);
    res.status(200).json({ status: 'success', data: { url } });
});

const ListFiles = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const { entityType, entityId } = req.query;
    if (typeof entityType !== 'string' || !entityType.trim()) throw new APIError(400, 'entityType is required');
    if (typeof entityId !== 'string' || !entityId.trim()) throw new APIError(400, 'entityId is required');

    const limit = Number(req.query.limit);
    const offset = Number(req.query.offset);
    const files = await FileService.ListFiles(entityType, entityId, userId, {
        limit: Number.isFinite(limit) ? limit : 20,
        offset: Number.isFinite(offset) ? offset : 0,
    });
    res.status(200).json({ status: 'success', data: files });
});

const DeleteFile = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await FileService.DeleteFile(req.params.id, userId);
    res.status(200).json({ status: 'success', data: null });
});

module.exports = { UploadFile, GetFileUrl, ListFiles, DeleteFile };
