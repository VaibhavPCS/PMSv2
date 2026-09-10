const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');
const { Encrypt, Decrypt } = require('./encryption.service');

const MENTION_RE = /@\[([0-9a-fA-F-]{36})\]/g;

// Extract mentioned userIds from "@[<uuid>]" tokens in the raw text.
const _extractMentions = (text) => {
    const ids = new Set();
    let match;
    while ((match = MENTION_RE.exec(text)) !== null) {
        ids.add(match[1]);
    }
    return [...ids];
};

const _decrypt = (comment) => {
    if (comment.isDeleted) {
        return { ...comment, content: 'This comment was deleted' };
    }
    const content = Decrypt({ content: comment.content, iv: comment.iv, authTag: comment.authTag });
    return { ...comment, content };
};

// Local authz: the author must be a member of the comment's workspace.
// Backed by WorkspaceMemberCache, populated from WORKSPACE_EVENTS.
const _assertWorkspaceMember = async (workspaceId, userId) => {
    const member = await prisma.workspaceMemberCache.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) throw new APIError(403, 'You are not a member of this workspace');
};

// Referenced-entity existence guard, backed by EntityExistsCache (populated from
// *_CREATED / *_DELETED events). Trade-off: we ONLY block when there is an
// explicit exists=false row. A missing row means the cache is cold (we may not
// have seen the CREATED event yet) and we ALLOW the comment rather than reject
// a valid target — eventual consistency over false negatives.
const _assertEntityExists = async (entityType, entityId) => {
    const row = await prisma.entityExistsCache.findUnique({
        where: { entityType_entityId: { entityType, entityId } },
    });
    if (row && row.exists === false) {
        throw new APIError(404, `This ${entityType} no longer exists`);
    }
};

const CreateComment = async (authorId, { workspaceId, entityType, entityId, content, parentId = null, attachments = [] }) => {
    await _assertWorkspaceMember(workspaceId, authorId);
    await _assertEntityExists(entityType, entityId);

    if (parentId) {
        const parent = await prisma.comment.findFirst({ where: { id: parentId, entityType, entityId, isDeleted: false } });
        if (!parent) throw new APIError(400, 'Invalid parent comment for this entity');
        if (parent.parentId) throw new APIError(400, 'Cannot reply to a reply — threads are one level deep');
    }

    const mentions = _extractMentions(content);
    const { content: cipher, iv, authTag } = Encrypt(content);

    const comment = await prisma.comment.create({
        data: {
            workspaceId, entityType, entityId, authorId,
            content: cipher, iv, authTag, parentId,
            mentions, attachments,
        },
    });

    return { ..._decrypt(comment), mentions };
};

const GetComments = async (entityType, entityId, { page = 1, limit = 20 } = {}) => {
    const safePage = Math.max(1, Math.trunc(Number(page) || 1));
    const safeLimit = Math.max(1, Math.min(100, Math.trunc(Number(limit) || 20)));

    const comments = await prisma.comment.findMany({
        where: { entityType, entityId, parentId: null },
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
            reactions: true,
            replies: { orderBy: { createdAt: 'asc' }, include: { reactions: true } },
        },
    });

    return comments.map((c) => ({
        ..._decrypt(c),
        replies: c.replies.map(_decrypt),
    }));
};

const GetReplies = async (commentId, { page = 1, limit = 20 } = {}) => {
    const parent = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!parent) throw new APIError(404, 'Comment not found');

    const safePage = Math.max(1, Math.trunc(Number(page) || 1));
    const safeLimit = Math.max(1, Math.min(100, Math.trunc(Number(limit) || 20)));

    const replies = await prisma.comment.findMany({
        where: { parentId: commentId },
        orderBy: { createdAt: 'asc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: { reactions: true },
    });
    return replies.map(_decrypt);
};

const EditComment = async (commentId, userId, newContent) => {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new APIError(404, 'Comment not found');
    if (comment.isDeleted) throw new APIError(410, 'Comment was deleted');
    if (comment.authorId !== userId) throw new APIError(403, 'You can only edit your own comments');

    const mentions = _extractMentions(newContent);
    const { content: cipher, iv, authTag } = Encrypt(newContent);

    const updated = await prisma.comment.update({
        where: { id: commentId },
        data: { content: cipher, iv, authTag, isEdited: true, mentions },
    });
    return { ..._decrypt(updated), mentions };
};

const DeleteComment = async (commentId, userId) => {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new APIError(404, 'Comment not found');
    if (comment.authorId !== userId) throw new APIError(403, 'You can only delete your own comments');

    await prisma.comment.update({ where: { id: commentId }, data: { isDeleted: true } });
    return { id: commentId, entityType: comment.entityType, entityId: comment.entityId };
};

const AddReaction = async (commentId, userId, emoji) => {
    const comment = await prisma.comment.findFirst({ where: { id: commentId, isDeleted: false } });
    if (!comment) throw new APIError(404, 'Comment not found');

    try {
        await prisma.commentReaction.create({ data: { commentId, userId, emoji } });
    } catch (err) {
        if (err.code !== 'P2002') throw err;
    }
    return { entityType: comment.entityType, entityId: comment.entityId };
};

const RemoveReaction = async (commentId, userId, emoji) => {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new APIError(404, 'Comment not found');
    await prisma.commentReaction.deleteMany({ where: { commentId, userId, emoji } });
    return { entityType: comment.entityType, entityId: comment.entityId };
};

const GetCommentCount = async (entityType, entityId) => {
    return prisma.comment.count({ where: { entityType, entityId, isDeleted: false } });
};

// Soft-delete every comment for an entity (used when the entity itself is deleted).
const SoftDeleteByEntity = async (entityType, entityId) => {
    const { count } = await prisma.comment.updateMany({
        where: { entityType, entityId, isDeleted: false },
        data: { isDeleted: true },
    });
    return count;
};

module.exports = {
    CreateComment,
    GetComments,
    GetReplies,
    EditComment,
    DeleteComment,
    AddReaction,
    RemoveReaction,
    GetCommentCount,
    SoftDeleteByEntity,
};
