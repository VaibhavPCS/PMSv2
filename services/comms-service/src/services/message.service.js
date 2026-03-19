const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');
const { Encrypt, Decrypt } = require('./encryption.service');

const _getMessageForParticipant = async (messageId, userId) => {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new APIError(404, 'Message not found');

    const participant = await prisma.chatParticipant.findFirst({
        where: { chatId: message.chatId, userId, isActive: true },
    });
    if (!participant) throw new APIError(403, 'You are not a participant in this chat');

    return message;
};

const SendMessage = async (chatId, senderId, plaintext, parentMessageId = null) => {
    const participant = await prisma.chatParticipant.findFirst({ where: { chatId, userId: senderId, isActive: true } });
    if (!participant) throw new APIError(403, 'You are not a participant in this chat');

    if (parentMessageId) {
        const parent = await prisma.message.findFirst({ where: { id: parentMessageId, chatId } });
        if (!parent) throw new APIError(400, 'Invalid parent message for this chat');
    }

    const { content, iv, authTag } = Encrypt(plaintext);
    const message = await prisma.message.create({
        data: { chatId, senderId, content, iv, authTag, parentMessageId },
    });

    return { ...message, content: plaintext };
};

const GetMessages = async (chatId, userId, page = 1, limit = 20) => {
    const participant = await prisma.chatParticipant.findFirst({ where: { chatId, userId, isActive: true } });
    if (!participant) throw new APIError(403, 'You are not a participant in this chat');

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (!Number.isFinite(pageNumber) || !Number.isFinite(limitNumber)) {
        throw new APIError(400, 'Invalid pagination parameters');
    }

    const safePage = Math.max(1, Math.trunc(pageNumber));
    const safeLimit = Math.max(1, Math.min(100, Math.trunc(limitNumber)));

    const messages = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: { reactions: true, reads: true },
    });

    return messages.map((msg) => {
        if (msg.isDeleted) {
            return { ...msg, content: 'This message was deleted' };
        }
        const decryptedContent = Decrypt({ content: msg.content, iv: msg.iv, authTag: msg.authTag });
        return { ...msg, content: decryptedContent };
    });
};

const EditMessage = async (messageId, userId, newPlaintext) => {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new APIError(404, 'Message not found');
    if (message.isDeleted) throw new APIError(410, 'Message was deleted');
    if (message.senderId !== userId) throw new APIError(403, 'You can only edit your own messages');

    const { content, iv, authTag } = Encrypt(newPlaintext);
    const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: { content, iv, authTag, isEdited: true },
    });

    return { ...updatedMessage, content: newPlaintext };
};

const DeleteMessage = async (messageId, userId) => {
    const message = await prisma.message.findUnique({ where: { id: messageId }, include: { chat: { include: { participants: true } } } });
    if (!message) throw new APIError(404, 'Message not found');

    const isSender = message.senderId === userId;
    const isAdmin = message.chat.participants.some((p) => p.userId === userId && p.role === 'admin' && p.isActive === true);

    if (!isSender && !isAdmin) throw new APIError(403, 'You can only delete your own messages or you must be a chat admin');

    await prisma.message.update({ where: { id: messageId }, data: { isDeleted: true } });
    return { id: messageId, chatId: message.chatId };
};

const AddReaction = async (messageId, userId, emoji) => {
    const message = await _getMessageForParticipant(messageId, userId);
    if (message.isDeleted) throw new APIError(410, 'Cannot react to a deleted message');

    try {
        await prisma.messageReaction.create({ data: { messageId, userId, emoji } });
    } catch (err) {
        if (err.code !== 'P2002') throw err;
    }

    return { chatId: message.chatId };
};

const RemoveReaction = async (messageId, userId, emoji) => {
    const message = await _getMessageForParticipant(messageId, userId);
    await prisma.messageReaction.deleteMany({ where: { messageId, userId, emoji } });
    return { chatId: message.chatId };
};

const MarkAsRead = async (messageId, userId) => {
    await _getMessageForParticipant(messageId, userId);
    await prisma.messageRead.upsert({
        where: { messageId_userId: { messageId, userId } },
        update: {},
        create: { messageId, userId },
    });
};

const GetUnreadCount = async (userId) => {
    const result = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM "Message" m
    JOIN "ChatParticipant" cp ON m."chatId" = cp."chatId"
    WHERE cp."userId" = ${userId}
      AND cp."isActive" = true
      AND m."isDeleted" = false
      AND NOT EXISTS (
        SELECT 1 FROM "MessageRead" mr
        WHERE mr."messageId" = m.id AND mr."userId" = ${userId}
      )
  `;
    return Number(result[0].count);
};

module.exports = {
    SendMessage,
    GetMessages,
    EditMessage,
    DeleteMessage,
    AddReaction,
    RemoveReaction,
    MarkAsRead,
    GetUnreadCount,
};