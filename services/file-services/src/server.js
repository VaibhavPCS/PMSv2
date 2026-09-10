const { HandleUncaughtException, HandleUnhandledRejection } = require('@pms/error-handler');
const { CreateLogger } = require('@pms/logger');
const { EnsureBucket } = require('./config/seaweedfs');
const { StartConsumer } = require('./events/consumers');

HandleUncaughtException();

const App = require('./app');
const Logger = CreateLogger('file-service');
const PORT = process.env.PORT || 4008;

const StartServer = async () => {
  try {
    await EnsureBucket();
  } catch (err) {
    Logger.error(`file-service failed to initialize SeaweedFS bucket: ${err.message}`);
    process.exit(1);
  }

  const Server = App.listen(PORT, () => {
    Logger.info(`file-service running on port ${PORT}`);
    StartConsumer();
  });

  HandleUnhandledRejection(Server);
};

StartServer();
