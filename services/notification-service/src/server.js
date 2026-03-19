const { HandleUncaughtException, HandleUnhandledRejection } = require('@pms/error-handler');
const { CreateLogger } = require('@pms/logger');
const { StartConsumers } = require('./events/consumers');

HandleUncaughtException();

const App = require('./app');
const Logger = CreateLogger('notification-service');
const PORT = process.env.PORT || 4005;

const Server = App.listen(PORT, () => {
  Logger.info(`notification-service running on port ${PORT}`);
  StartConsumers();
});

HandleUnhandledRejection(Server);
