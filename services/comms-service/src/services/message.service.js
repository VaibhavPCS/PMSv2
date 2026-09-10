const sanitizeHtml = require('sanitize-html');
const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');
const { DAY_MS } = require('@pms/constants');
const { Encrypt, Decrypt } = require('./encryption.service');
const AuthClient = require('../clients/auth.client');

const SANITIZE_OPTIONS = {
    allowedTags: ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'a', 'ul', 'ol', 'li'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
};

const _sanitize = (plaintext) => sanitizeHtml(plaintext, SANITIZE_OPTIONS);

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

    const sanitized = _sanitize(plaintext);
    const { content, iv, authTag } = Encrypt(sanitized);
    const message = await prisma.message.create({
        data: { chatId, senderId, content, iv, authTag, parentMessageId },
    });

    // Hydrate `sender` so the HTTP response AND the 'new-message' socket
    // broadcast carry { _id, name, profilePicture } — the chat window renders
    // message.sender.* and crashes without it. Soft-fails to senderId-only.
    const orgUsers = await AuthClient.ListOrganizationUsers();
    const sender = orgUsers.find((u) => u._id === senderId)
        || { _id: senderId, name: 'Unknown', email: '', profilePicture: null };

    return { ...message, sender, content: sanitized };
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

    // comms owns no user data; hydrate each message's `sender` ({ _id, name,
    // profilePicture }) from auth-service so the frontend can render avatars and
    // group consecutive messages by sender. Soft-fails to senderId-only.
    const orgUsers = await AuthClient.ListOrganizationUsers();
    const usersById = new Map(orgUsers.map((u) => [u._id, u]));
    const _sender = (senderId) =>
        usersById.get(senderId) || { _id: senderId, name: 'Unknown', email: '', profilePicture: null };

    return messages.map((msg) => {
        const sender = _sender(msg.senderId);
        if (msg.isDeleted) {
            return { ...msg, sender, content: 'This message was deleted' };
        }
        const decryptedContent = Decrypt({ content: msg.content, iv: msg.iv, authTag: msg.authTag });
        return { ...msg, sender, content: decryptedContent };
    });
};

const EditMessage = async (messageId, userId, newPlaintext) => {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new APIError(404, 'Message not found');
    if (message.isDeleted) throw new APIError(410, 'Message was deleted');
    if (message.senderId !== userId) throw new APIError(403, 'You can only edit your own messages');
    if (Date.now() - new Date(message.createdAt).getTime() > DAY_MS) {
        throw new APIError(403, 'Cannot edit messages older than 24 hours');
    }

    const sanitized = _sanitize(newPlaintext);
    const { content, iv, authTag } = Encrypt(sanitized);
    const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: { content, iv, authTag, isEdited: true },
    });

    return { ...updatedMessage, content: sanitized };
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

// Marks every unread message in a chat as read for the user (bulk). Called when
// the user opens a chat — without this the sidebar unread badge never clears,
// since the count is recomputed server-side on each refresh. Returns how many
// rows were newly marked.
const MarkChatAsRead = async (chatId, userId) => {
    const participant = await prisma.chatParticipant.findFirst({ where: { chatId, userId, isActive: true } });
    if (!participant) throw new APIError(403, 'You are not a participant in this chat');

    const unread = await prisma.message.findMany({
        where: { chatId, isDeleted: false, senderId: { not: userId }, reads: { none: { userId } } },
        select: { id: true },
    });
    if (unread.length === 0) return { marked: 0 };

    await prisma.messageRead.createMany({
        data: unread.map((m) => ({ messageId: m.id, userId })),
        skipDuplicates: true,
    });
    return { marked: unread.length };
};

// Total unread messages for the user across all chats they actively
// participate in. The previous implementation used a $queryRaw that
// referenced PascalCase table names ("Message"/"ChatParticipant"/
// "MessageRead"); the physical tables are snake_case (@@map) so that query
// threw at runtime. Use the typed Prisma API which honours @@map and also
// excludes the user's own messages.
const GetUnreadCount = async (userId) => {
    const count = await prisma.message.count({
        where: {
            isDeleted: false,
            senderId: { not: userId },
            chat: { participants: { some: { userId, isActive: true } } },
            reads: { none: { userId } },
        },
    });
    return count;
};

module.exports = {
    SendMessage,
    GetMessages,
    EditMessage,
    DeleteMessage,
    AddReaction,
    RemoveReaction,
    MarkAsRead,
    MarkChatAsRead,
    GetUnreadCount,
};