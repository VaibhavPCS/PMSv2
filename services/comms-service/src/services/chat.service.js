const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');

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

module.exports = {
    CreateChat,
    GetMyChats,
    GetChatById,
    AddParticipant,
    RemoveParticipant,
    ArchiveChat,
};