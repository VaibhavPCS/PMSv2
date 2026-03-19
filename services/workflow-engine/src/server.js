const { HandleUncaughtException, HandleUnhandledRejection } = require('@pms/error-handler');
const { CreateLogger } = require('@pms/logger');
const { StartEscalationChecker } = require('./engine/escalation-manager');

HandleUncaughtException();

const App = require('./app');
const Logger = CreateLogger('workflow-engine');
const PORT = process.env.PORT || 4006;

const Server = App.listen(PORT, () => {
  Logger.info(`workflow-engine running on port ${PORT}`);
  StartEscalationChecker();
});

HandleUnhandledRejection(Server);
