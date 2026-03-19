const prisma = require('../config/prisma');
const { PublishWorkflowSLABreached } = require('../events/publishers');

const StartEscalationChecker = () => {
  setInterval(RunCheck, 15 * 60 * 1000);
};

const RunCheck = async () => {
  const instances = await prisma.workflowInstance.findMany({
    where: { isTerminal: false },
    include: { slaTracking: true, definition: true },
  });

  const now = Date.now();

  for (const instance of instances) {
    const open = instance.slaTracking.find((row) => row.exitedAt === null);
    if (!open) continue;

    const stageRules = instance.definition.definition?.escalationRules?.find((r) => r.stage === instance.currentStage);
    if (!stageRules) continue;

    const hoursElapsed = (now - open.enteredAt.getTime()) / 3_600_000;
    if (hoursElapsed >= stageRules.maxHoursInStage && !open.slaBreached) {
      await prisma.workflowSLATracking.update({
        where: { id: open.id },
        data: { slaBreached: true },
      });
      PublishWorkflowSLABreached(instance.taskId, instance.currentStage, hoursElapsed, stageRules);
    }
  }
};

module.exports = { StartEscalationChecker, RunCheck };