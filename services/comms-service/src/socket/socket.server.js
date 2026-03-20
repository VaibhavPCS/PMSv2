const { Server } = require('socket.io');
const SuperTokens = require('supertokens-node');
const prisma = require('../config/prisma');

const AttachSocket = (httpServer) => {
    const allowedOrigin = process.env.WEBSITE_DOMAIN;
    if (!allowedOrigin || !allowedOrigin.trim()) {
        throw new Error('Missing required env var: WEBSITE_DOMAIN');
    }

    const io = new Server(httpServer, {
        cors: {
            origin: allowedOrigin,
            credentials: true,
        },
    });

    io.use(async (socket, next) => {
        try {
            const session = await SuperTokens.getSession(
                socket.request,
                socket.request.res ?? {},
                { sessionRequired: true },
            );
            socket.userId = session.getUserId();
            next();
        } catch (err) {
            console.error('[comms-service] Socket auth failed:', err.message);
            next(new Error('Unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        const _isValidProjectId = (projectId) => typeof projectId === 'string' && projectId.trim().length > 0;

        socket.on('join-chat', async (chatId) => {
            try {
                if (typeof chatId !== 'string' || !chatId.trim()) {
                    socket.emit('error', { message: 'Invalid chatId' });
                    return;
                }

                const participant = await prisma.chatParticipant.findFirst({
                    where: { chatId, userId: socket.userId, isActive: true },
                });

                if (!participant) {
                    socket.emit('permission-denied', { chatId });
                    return;
                }

                socket.join(`chat:${chatId}`);
            } catch (err) {
                console.error('[comms-service] join-chat failed:', {
                    socketId: socket.id,
                    room: `chat:${chatId}`,
                    error: err.message,
                    stack: err.stack,
                });
                socket.emit('error', { message: 'Failed to join chat' });
            }
        });

        socket.on('leave-chat', (chatId) => {
            socket.leave(`chat:${chatId}`);
        });

        socket.on('join-project', async (projectId) => {
            try {
                if (!_isValidProjectId(projectId) || !socket.userId) {
                    socket.emit('permission-denied', { projectId, reason: 'invalid-request' });
                    return;
                }

                socket.join(`project:${projectId}`);
            } catch (err) {
                console.error('[comms-service] join-project failed:', {
                    socketId: socket.id,
                    projectId,
                    error: err.message,
                    stack: err.stack,
                });
                socket.emit('permission-denied', { projectId, reason: 'join-failed' });
            }
        });

        socket.on('leave-project', async (projectId) => {
            try {
                if (!_isValidProjectId(projectId) || !socket.userId) {
                    socket.emit('permission-denied', { projectId, reason: 'invalid-request' });
                    return;
                }

                socket.leave(`project:${projectId}`);
            } catch (err) {
                console.error('[comms-service] leave-project failed:', {
                    socketId: socket.id,
                    projectId,
                    error: err.message,
                    stack: err.stack,
                });
                socket.emit('permission-denied', { projectId, reason: 'leave-failed' });
            }
        });

        socket.on('typing', ({ chatId, typing }) => {
            if (typeof chatId !== 'string' || !chatId.trim()) {
                return;
            }

            if (!socket.rooms.has(`chat:${chatId}`)) {
                return;
            }

            socket.to(`chat:${chatId}`).emit('typing', {
                userId: socket.userId,
                chatId,
                typing,
            });
        });

        socket.on('disconnect', () => {
        });
    });

    return io;
};

module.exports = AttachSocket;
