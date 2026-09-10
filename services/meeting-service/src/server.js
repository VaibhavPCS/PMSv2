const { HandleUncaughtException, HandleUnhandledRejection } = require('@pms/error-handler');
const { CreateLogger } = require('@pms/logger');
const { StartReminderChecker } = require('./services/reminder.service');
const { StartConsumer } = require('./events/consumers');

HandleUncaughtException();

const App = require('./app');
const Logger = CreateLogger('meeting-service');
const PORT = process.env.PORT || 4009;

let checkerStarted = false;

const Server = App.listen(PORT, () => {
  Logger.info(`meeting-service running on port ${PORT}`);

  StartConsumer();

  if (!checkerStarted) {
    StartReminderChecker()
      .then(() => { checkerStarted = true; })
      .catch((err) => {
        Logger.error(`meeting-service failed to start reminder checker: ${err.message}`);
        process.exit(1);
      });
  }
});

Server.on('error', (err) => {
  Logger.error(`meeting-service failed to bind: ${err.code || 'UNKNOWN'} ${err.message}`);
  process.exit(1);
});

HandleUnhandledRejection(Server);
