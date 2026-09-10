const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');
const AuthClient = require('../clients/auth.client');

const CreateChat = async (createdBy, workspaceId, { name, type, participantIds }) => {
    const uniqueParticipants = [...new Set([...(Array.isArray(participantIds) ? participantIds : []), createdBy])];

    const chat = await prisma.chat.create({
        data: {
            workspaceId,
            name,
            type,
            createdBy,
            participants: {
                create: uniqueParticipants.map((userId) => ({
                    userId,
                    role: userId === createdBy ? 'admin' : 'member',
                })),
            },
        },
    });
    return chat;
};

const GetMyChats = async (userId, workspaceId) => {
    const chats = await prisma.chat.findMany({
        where: {
            workspaceId,
            isArchived: false,
            participants: { some: { userId, isActive: true } },
        },
        include: { participants: true },
    });
    return chats;
};

// Organization-wide chat list: every chat the user actively participates in,
// across ALL workspaces (the frontend chat page is org-scoped, not workspace-scoped).
// comms owns no user data, so each participant is hydrated with a nested `user`
// object ({ _id, name, email, profilePicture }) pulled from auth-service — the
// sidebar renders participant.user.{name,profilePicture}. Soft-fails to userId
// only if auth is unreachable.
const GetOrganizationChats = async (userId) => {
    const chats = await prisma.chat.findMany({
        where: {
            isArchived: false,
            participants: { some: { userId, isActive: true } },
        },
        include: { participants: true },
        orderBy: { updatedAt: 'desc' },
    });

    const orgUsers = await AuthClient.ListOrganizationUsers();
    const usersById = new Map(orgUsers.map((u) => [u._id, u]));

    return chats.map((chat) => ({
        ...chat,
        participants: chat.participants.map((p) => ({
            ...p,
            user: usersById.get(p.userId) || { _id: p.userId, name: 'Unknown', email: '', profilePicture: null },
        })),
    }));
};

// Org-wide user list for the chat people-picker. comms owns no user data, so it
// delegates to auth-service (soft-fails to [] — picker degrades, never 502s).
const GetOrganizationUsers = async () => {
    return AuthClient.ListOrganizationUsers();
};

const GetChatById = async (chatId, userId) => {
    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: { participants: true },
    });
    if (!chat) throw new APIError(404, 'Chat not found');
    const participant = chat.participants.find((p) => p.userId === userId && p.isActive);
    if (!participant) throw new APIError(403, 'Access denied');
    return chat;
};

const AddParticipant = async (chatId, requesterId, userId) => {
    const chat = await GetChatById(chatId, requesterId);
    const requesterParticipant = chat.participants.find((p) => p.userId === requesterId && p.isActive);
    if (!requesterParticipant || requesterParticipant.role !== 'admin') {
      throw new APIError(403, 'Only admins can add participants');
    }

    await prisma.chatParticipant.upsert({
        where: { chatId_userId: { chatId, userId } },
        update: { isActive: true },
        create: { chatId, userId, role: 'member' },
    });
};

const RemoveParticipant = async (chatId, requesterId, userId) => {
    const chat = await GetChatById(chatId, requesterId);
    const requesterParticipant = chat.participants.find((p) => p.userId === requesterId);
    if (requesterParticipant.role !== 'admin') throw new APIError(403, 'Only admins can remove participants');

    const targetParticipant = chat.participants.find((p) => p.userId === userId);
    if (!targetParticipant) throw new APIError(404, 'Participant not found in chat');

    await prisma.chatParticipant.update({
        where: { chatId_userId: { chatId, userId } },
        data: { isActive: false },
    });
};

const ArchiveChat = async (chatId, requesterId) => {
    const chat = await GetChatById(chatId, requesterId);
    const requesterParticipant = chat.participants.find((p) => p.userId === requesterId);
    if (requesterParticipant.role !== 'admin') throw new APIError(403, 'Only admins can archive chats');
    await prisma.chat.update({
        where: { id: chatId },
        data: { isArchived: true },
    });
};

// Counts unread messages for the user across all chats they actively
// participate in. A message is "unread" when it is not deleted, was not
// sent by the user, belongs to a chat where the user is an active
// participant, and has no MessageRead row for the user.
// Uses the typed Prisma API so the @@map table names are honoured (a raw
// SQL query that referenced the PascalCase model names would fail because
// the physical tables are snake_case: messages, chat_participants, etc.).
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
    CreateChat,
    GetMyChats,
    GetOrganizationChats,
    GetOrganizationUsers,
    GetChatById,
    AddParticipant,
    RemoveParticipant,
    ArchiveChat,
    GetUnreadCount,
};