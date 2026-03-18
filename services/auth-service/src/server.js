const { HandleUncaughtException, HandleUnhandledRejection } = require('@pms/error-handler');
const { CreateLogger } = require('@pms/logger');

HandleUncaughtException();

const App    = require('./app');
const Logger = CreateLogger('auth-service');
const PORT   = process.env.PORT || 4001;

const Server = App.listen(PORT, () => {
  Logger.info(`auth-service running on port ${PORT}`);
});

HandleUnhandledRejection(Server);
