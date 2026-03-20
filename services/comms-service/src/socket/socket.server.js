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
      origin:      allowedOrigin,
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
    // Client joins a specific chat room — call on chat open
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

    // Client leaves a chat room — call on chat close / navigation away
    socket.on('leave-chat', (chatId) => {
      socket.leave(`chat:${chatId}`);
      // Clear the data on the client side — the frontend should clear its message array here
    });

    // Typing indicator — broadcast to everyone else in the chat
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

    // Socket.IO cleans up rooms automatically on disconnect
    socket.on('disconnect', () => {
      // no-op — rooms are cleaned up automatically
    });
  });

  return io;
};

module.exports = AttachSocket;
