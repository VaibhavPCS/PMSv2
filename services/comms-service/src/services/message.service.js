const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');
const { Encrypt, Decrypt } = require('./encryption.service');

const SendMessage = async (chatId, senderId, plaintext, parentMessageId = null) => {
    const participant = await prisma.chatParticipant.findFirst({ where: { chatId, userId: senderId, isActive: true } });
    if (!participant) throw new APIError(403, 'You are not a participant in this chat');

    const { content, iv, authTag } = Encrypt(plaintext);
    const message = await prisma.message.create({
        data: { chatId, senderId, content, iv, authTag, parentMessageId },
    });

    return { ...message, content: plaintext };
};

const GetMessages = async (chatId, userId, page = 1, limit = 20) => {
    const participant = await prisma.chatParticipant.findFirst({ where: { chatId, userId, isActive: true } });
    if (!participant) throw new APIError(403, 'You are not a participant in this chat');

    const messages = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
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
    const isAdmin = message.chat.participants.some((p) => p.userId === userId && p.role === 'admin');

    if (!isSender && !isAdmin) throw new APIError(403, 'You can only delete your own messages or you must be a chat admin');

    await prisma.message.update({ where: { id: messageId }, data: { isDeleted: true } });
    return { id: messageId, chatId: message.chatId };
};

const AddReaction = async (messageId, userId, emoji) => {
    try {
        await prisma.messageReaction.create({ data: { messageId, userId, emoji } });
    } catch (err) {
        if (err.code !== 'P2002') throw err;
    }
};

const RemoveReaction = async (messageId, userId, emoji) => {
    await prisma.messageReaction.deleteMany({ where: { messageId, userId, emoji } });
};

const MarkAsRead = async (messageId, userId) => {
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