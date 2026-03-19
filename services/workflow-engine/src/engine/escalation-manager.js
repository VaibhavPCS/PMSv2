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
    try {
      const open = instance.slaTracking.find((row) => row.exitedAt === null);
      if (!open) continue;

      const stageRules = instance.definition.definition?.escalationRules?.find((r) => r.stage === instance.currentStage);
      if (!stageRules) continue;

      const hoursElapsed = (now - open.enteredAt.getTime()) / 3_600_000;
      if (hoursElapsed >= stageRules.maxHoursInStage) {
        const result = await prisma.workflowSLATracking.updateMany({
          where: { id: open.id, slaBreached: false },
          data: { slaBreached: true },
        });

        if (result.count > 0) {
          await PublishWorkflowSLABreached(instance.taskId, instance.currentStage, hoursElapsed, stageRules);
        }
      }
    } catch (err) {
      console.error('[workflow-engine] escalation check failed for instance', {
        instanceId: instance.id,
        taskId: instance.taskId,
        error: err.message,
      });
    }
  }
};

module.exports = { StartEscalationChecker, RunCheck };