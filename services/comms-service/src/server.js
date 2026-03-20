const http = require('http');
const { HandleUncaughtException, HandleUnhandledRejection } = require('@pms/error-handler');
const { CreateLogger } = require('@pms/logger');

HandleUncaughtException();

const App        = require('./app');
const AttachSocket = require('./socket/socket.server');
const { StartConsumer, SetIo } = require('./events/consumers');
const Logger     = CreateLogger('comms-service');
const PORT       = process.env.PORT || 4007;

const Server = http.createServer(App);
const io     = AttachSocket(Server);
App.set('io', io);

Server.on('error', (err) => {
  Logger.error('comms-service failed to bind HTTP server', {
    code: err.code,
    message: err.message,
    port: PORT,
  });

  const forceExitTimer = setTimeout(() => {
    process.exit(1);
  }, 5000);

  if (Server.listening) {
    Server.close((err) => {
      clearTimeout(forceExitTimer);
      if (err) Logger.error('Error while closing HTTP server', { message: err.message });
      process.exit(1);
    });
  } else {
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
});

Server.listen(PORT, () => {
  Logger.info(`comms-service running on port ${PORT}`);
  SetIo(io);
  StartConsumer();
});

HandleUnhandledRejection(Server);