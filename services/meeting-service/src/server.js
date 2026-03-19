const { HandleUncaughtException, HandleUnhandledRejection } = require('@pms/error-handler');
const { CreateLogger } = require('@pms/logger');
const { StartReminderChecker } = require('./services/reminder.service');

HandleUncaughtException();

const App = require('./app');
const Logger = CreateLogger('meeting-service');
const PORT = process.env.PORT || 4009;

const Server = App.listen(PORT, () => {
  Logger.info(`meeting-service running on port ${PORT}`);
  StartReminderChecker();
});

HandleUnhandledRejection(Server);
