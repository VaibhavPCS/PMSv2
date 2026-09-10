const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');
const StorageService = require('./storage.service');

// Local authz: the uploader must be a member of the file's workspace.
// Backed by WorkspaceMemberCache, populated from WORKSPACE_EVENTS.
const _assertWorkspaceMember = async (workspaceId, userId) => {
    const member = await prisma.workspaceMemberCache.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) throw new APIError(403, 'You are not a member of this workspace');
};

// NOTE: files are scoped to their entity (task/project), not to the uploader.
// Any authenticated caller may read an entity's files so teammates can see
// attachments. Membership enforcement is tracked as a cross-service follow-up
// (see docs/BUG_REPORT.md H2); delete remains uploader-only.

const UploadFile = async (uploadedBy, workspaceId, entityType, entityId, file) => {
    await _assertWorkspaceMember(workspaceId, uploadedBy);

    const storagePath = await StorageService.Upload(workspaceId, entityId, file.buffer, file.originalname, file.mimetype);

    let record;
    try {
        record = await prisma.file.create({
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
        return { ...record, sizeBytes: record.sizeBytes.toString(), url };
    } catch (err) {
        await StorageService.Delete(storagePath).catch(() => null);
        if (record) {
            await prisma.file.delete({ where: { id: record.id } }).catch(() => null);
        }
        throw err;
    }
};

const GetFileUrl = async (fileId, _userId) => {
    const file = await prisma.file.findFirst({ where: { id: fileId, isDeleted: false } });
    if (!file) throw new APIError(404, 'File not found');
    return await StorageService.GetPresignedUrl(file.storagePath);
};

const ListFiles = async (entityType, entityId, userId, { limit = 20, offset = 0 } = {}) => {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const safeOffset = Math.max(0, Number(offset) || 0);

    const files = await prisma.file.findMany({
        where: { entityType, entityId, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        skip: safeOffset,
        take: safeLimit,
    });
    return files.map((f) => ({ ...f, sizeBytes: f.sizeBytes.toString() }));
};

const DeleteFile = async (fileId, userId) => {
    const file = await prisma.file.findFirst({ where: { id: fileId, isDeleted: false } });
    if (!file) throw new APIError(404, 'File not found');
    if (file.uploadedBy !== userId) throw new APIError(403, 'Forbidden: You can only delete files you uploaded');
    await prisma.file.update({ where: { id: fileId }, data: { isDeleted: true } });

    try {
        await StorageService.Delete(file.storagePath);
    } catch (deleteErr) {
        try {
            await prisma.file.update({ where: { id: fileId }, data: { isDeleted: false } });
        } catch (rollbackErr) {
            console.error('[file-service] CRITICAL: storage delete failed and DB rollback failed — manual remediation required', {
                fileId,
                storagePath: file.storagePath,
                deleteError: deleteErr.message,
                rollbackError: rollbackErr.message,
            });
        }
        throw deleteErr;
    }
};

module.exports = {
    UploadFile,
    GetFileUrl,
    ListFiles,
    DeleteFile,
};