const http = require('http');
const { HandleUncaughtException, HandleUnhandledRejection } = require('@pms/error-handler');
const { CreateLogger } = require('@pms/logger');

HandleUncaughtException();

const App = require('./app');
const AttachSocket = require('./socket/socket.server');
const Logger = CreateLogger('comms-service');
const PORT = process.env.PORT || 4007;

const Server = http.createServer(App);
const io = AttachSocket(Server);
App.set('io', io);

Server.listen(PORT, () => {
  Logger.info(`comms-service running on port ${PORT}`);
});

HandleUnhandledRejection(Server);
