const { HandleUncaughtException, HandleUnhandledRejection } = require('@pms/error-handler');
const { CreateLogger } = require('@pms/logger');
const { StartEscalationChecker } = require('./engine/escalation-manager');

HandleUncaughtException();

const App = require('./app');
const Logger = CreateLogger('workflow-engine');
const PORT = process.env.PORT || 4006;

let checkerStarted = false;

const Server = App.listen(PORT, () => {
  Logger.info(`workflow-engine running on port ${PORT}`);

  if (!checkerStarted) {
    try {
      StartEscalationChecker();
      checkerStarted = true;
    } catch (err) {
      Logger.error(`workflow-engine failed to start escalation checker: ${err.message}`);
      process.exit(1);
    }
  }
});

Server.on('error', (err) => {
  Logger.error(`workflow-engine failed to bind: ${err.code || 'UNKNOWN'} ${err.message}`);
  process.exit(1);
});

HandleUnhandledRejection(Server);
