const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');
const StorageService = require('./storage.service');

const _assertCanAccessFile = (file, userId) => {
    if (file.uploadedBy !== userId) {
        throw new APIError(403, 'Forbidden');
    }
};

const UploadFile = async (uploadedBy, workspaceId, entityType, entityId, file) => {
    const storagePath = await StorageService.Upload(workspaceId, entityId, file.buffer, file.originalname, file.mimetype);

    try {
        const record = await prisma.file.create({
            data: {
                uploadedBy,
                workspaceId,
                entityType,
                entityId,
                filename: file.originalname,
                storagePath,
                mimeType: file.mimetype,
                sizeBytes: BigInt(file.size),
            },
        });
        const url = await StorageService.GetPresignedUrl(storagePath);
        return { ...record, url };
    } catch (err) {
        await StorageService.Delete(storagePath).catch(() => null);
        throw err;
    }
};

const GetFileUrl = async (fileId, userId) => {
    const file = await prisma.file.findFirst({ where: { id: fileId, isDeleted: false } });
    if (!file) throw new APIError(404, 'File not found');
    _assertCanAccessFile(file, userId);
    return await StorageService.GetPresignedUrl(file.storagePath);
};

const ListFiles = async (entityType, entityId, userId, { limit = 20, offset = 0 } = {}) => {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const safeOffset = Math.max(0, Number(offset) || 0);

    return prisma.file.findMany({
        where: { entityType, entityId, uploadedBy: userId, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        skip: safeOffset,
        take: safeLimit,
    });
};

const DeleteFile = async (fileId, userId) => {
    const file = await prisma.file.findFirst({ where: { id: fileId, isDeleted: false } });
    if (!file) throw new APIError(404, 'File not found');
    if (file.uploadedBy !== userId) throw new APIError(403, 'Forbidden: You can only delete files you uploaded');
    await prisma.file.update({ where: { id: fileId }, data: { isDeleted: true } });

    try {
        await StorageService.Delete(file.storagePath);
    } catch (err) {
        await prisma.file.update({ where: { id: fileId }, data: { isDeleted: false } });
        throw err;
    }
};

module.exports = {
    UploadFile,
    GetFileUrl,
    ListFiles,
    DeleteFile,
};