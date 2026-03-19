const { HandleUncaughtException, HandleUnhandledRejection } = require('@pms/error-handler');
const { CreateLogger } = require('@pms/logger');
const { StartConsumer } = require('./events/consumers');

HandleUncaughtException();

const App = require('./app');
const Logger = CreateLogger('project-service');
const PORT = process.env.PORT || 4003;

const Server = App.listen(PORT, () => {
  Logger.info(`project-service running on port ${PORT}`);
  StartConsumer();
});

HandleUnhandledRejection(Server);
