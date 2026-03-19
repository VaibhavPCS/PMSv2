const { CatchAsync, APIError } = require('@pms/error-handler');
const FileService = require('../services/file.service');

const UploadFile = CatchAsync(async (req, res) => {
    if (!req.file) throw new APIError(400, 'No file uploaded');
    const userId = req.session.getUserId();
    const { workspaceId, entityType, entityId } = req.body;
    const record = await FileService.UploadFile(userId, workspaceId, entityType, entityId, req.file);
    res.status(201).json({ status: 'success', data: record });
});

const GetFileUrl = CatchAsync(async (req, res) => {
    const url = await FileService.GetFileUrl(req.params.id);
    res.status(200).json({ status: 'success', data: { url } });
});

const ListFiles = CatchAsync(async (req, res) => {
    const { entityType, entityId } = req.query;
    const files = await FileService.ListFiles(entityType, entityId);
    res.status(200).json({ status: 'success', data: files });
});

const DeleteFile = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await FileService.DeleteFile(req.params.id, userId);
    res.status(200).json({ status: 'success', data: null });
});

module.exports = { UploadFile, GetFileUrl, ListFiles, DeleteFile };
