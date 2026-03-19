const { HandleUncaughtException, HandleUnhandledRejection } = require('@pms/error-handler');
const { CreateLogger } = require('@pms/logger');
const { EnsureBucket } = require('./config/minio');

HandleUncaughtException();

const App = require('./app');
const Logger = CreateLogger('file-service');
const PORT = process.env.PORT || 4008;

const StartServer = async () => {
  try {
    await EnsureBucket();
  } catch (err) {
    Logger.error(`file-service failed to initialize MinIO bucket: ${err.message}`);
    process.exit(1);
  }

  const Server = App.listen(PORT, () => {
    Logger.info(`file-service running on port ${PORT}`);
  });

  HandleUnhandledRejection(Server);
};

StartServer();
