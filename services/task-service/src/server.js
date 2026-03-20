const { HandleUncaughtException, HandleUnhandledRejection } = require('@pms/error-handler');
const { CreateLogger }             = require('@pms/logger');
const { StartConsumer }            = require('./events/consumers');
const { StartRecurringScheduler }  = require('./engine/recurring-scheduler');

HandleUncaughtException();

const App    = require('./app');
const Logger = CreateLogger('task-service');
const PORT   = process.env.PORT || 4004;

const Server = App.listen(PORT, () => {
  Logger.info(`task-service running on port ${PORT}`);
  StartConsumer();
  StartRecurringScheduler();
});

HandleUnhandledRejection(Server);