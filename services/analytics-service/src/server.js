const { HandleUncaughtException, HandleUnhandledRejection } = require('@pms/error-handler');
const { CreateLogger } = require('@pms/logger');
const { StartConsumers } = require('./events/consumers');
const { StartSnapshotScheduler } = require('./jobs/snapshot.scheduler');

HandleUncaughtException();

const App = require('./app');
const Logger = CreateLogger('analytics-service');
const PORT = process.env.PORT || 4012;

const Server = App.listen(PORT, () => {
  Logger.info(`analytics-service running on port ${PORT}`);
  // Async aggregation only: Kafka consumers maintain current-state tables,
  // the cron scheduler appends time-series snapshots. HTTP handlers only read.
  StartConsumers();
  StartSnapshotScheduler();
});

HandleUnhandledRejection(Server);
