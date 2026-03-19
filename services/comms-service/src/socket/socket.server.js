const { Server } = require('socket.io');
const SuperTokens = require('supertokens-node');

const AttachSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin:      process.env.WEBSITE_DOMAIN,
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
    socket.on('join-chat', (chatId) => {
      socket.join(`chat:${chatId}`);
    });

    // Client leaves a chat room — call on chat close / navigation away
    socket.on('leave-chat', (chatId) => {
      socket.leave(`chat:${chatId}`);
      // Clear the data on the client side — the frontend should clear its message array here
    });

    // Typing indicator — broadcast to everyone else in the chat
    socket.on('typing', ({ chatId, typing }) => {
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
