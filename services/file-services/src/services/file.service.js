const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');
const StorageService = require('./storage.service');

const UploadFile = async (uploadedBy, workspaceId, entityType, entityId, file) => {
    const storagePath = await StorageService.Upload(workspaceId, entityId, file.buffer, file.originalname, file.mimetype);
    const record = await prisma.file.create({
        data: {
            uploadedBy,
            workspaceId,
            entityType,
            entityId,
            filename: file.originalname,
            storagePath,
            mimeType: file.mimetype,
            sizeBytes: file.size,
        },
    });
    const url = await StorageService.GetPresignedUrl(storagePath);
    return { ...record, url };
};

const GetFileUrl = async (fileId) => {
    const file = await prisma.file.findFirst({ where: { id: fileId, isDeleted: false } });
    if (!file) throw new APIError(404, 'File not found');
    return await StorageService.GetPresignedUrl(file.storagePath);
};

const ListFiles = async (entityType, entityId) => {
    return prisma.file.findMany({ where: { entityType, entityId, isDeleted: false } });
};

const DeleteFile = async (fileId, userId) => {
    const file = await prisma.file.findFirst({ where: { id: fileId, isDeleted: false } });
    if (!file) throw new APIError(404, 'File not found');
    if (file.uploadedBy !== userId) throw new APIError(403, 'Forbidden: You can only delete files you uploaded');
    await StorageService.Delete(file.storagePath);
    await prisma.file.update({ where: { id: fileId }, data: { isDeleted: true } });
};

module.exports = {
    UploadFile,
    GetFileUrl,
    ListFiles,
    DeleteFile,
};