const { HandleUncaughtException, HandleUnhandledRejection } = require('@pms/error-handler');
const { CreateLogger }                                      = require('@pms/logger');
const { StartConsumers }                                    = require('./events/consumers');

HandleUncaughtException();

const App    = require('./app');
const Logger = CreateLogger('workspace-service');
const PORT   = process.env.PORT || 4002;

const Server = App.listen(PORT, () => {
  Logger.info(`workspace-service running on port ${PORT}`);
  StartConsumers();
});

HandleUnhandledRejection(Server);
