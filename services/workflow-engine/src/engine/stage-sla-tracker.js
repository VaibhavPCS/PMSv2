const prisma = require('../config/prisma');

const EnterStage = async (instanceId, stage) => {
  await prisma.workflowSLATracking.create({
    data: { instanceId, stage, enteredAt: new Date() },
  });
};

const ExitCurrentStage = async (instanceId) => {
  await prisma.workflowSLATracking.updateMany({
    where: { instanceId, exitedAt: null },
    data:  { exitedAt: new Date() },
  });
};

module.exports = { EnterStage, ExitCurrentStage };
