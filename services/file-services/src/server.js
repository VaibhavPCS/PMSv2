const { HandleUncaughtException, HandleUnhandledRejection } = require('@pms/error-handler');
const { CreateLogger } = require('@pms/logger');
const { EnsureBucket } = require('./config/minio');

HandleUncaughtException();

const App = require('./app');
const Logger = CreateLogger('file-service');
const PORT = process.env.PORT || 4008;

const Server = App.listen(PORT, async () => {
  Logger.info(`file-service running on port ${PORT}`);
  await EnsureBucket();
});

HandleUnhandledRejection(Server);
