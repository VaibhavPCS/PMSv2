const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');
const { ValidateTransition } = require('../engine/transition-validator');
const { AutoAssign } = require('../engine/auto-assignment');
const { PublishWorkflowTransitioned } = require('../events/publishers');

const CreateInstance = async (taskId, workflowDefinitionId, createdBy) => {
  const definition = await prisma.workflowDefinition.findUnique({
    where: { id: workflowDefinitionId, isActive: true },
  });
  if (!definition) {
    throw new APIError(404, 'Workflow definition not found or inactive.');
  }

  const instance = await prisma.workflowInstance.create({
    data: {
      taskId,
      workflowDefinitionId,
      currentStage: definition.definition.initialStage,
    },
  });

  await prisma.workflowSLATracking.create({
    data: {
      instanceId: instance.id,
      stage:      definition.definition.initialStage,
      enteredAt:  new Date(),
    },
  });

  return instance;
};

const GetInstance = async (taskId) => {
  const instance = await prisma.workflowInstance.findUnique({
    where: { taskId },
    include: {
      history: { orderBy: { createdAt: 'asc' } },
      slaTracking: true,
      definition: true,
    },
  });
  if (!instance) {
    throw new APIError(404, 'Workflow instance not found for the given task.');
  }
  return instance;
};

const TransitionStage = async (taskId, { toStage, note, attachmentUrl, referenceLink }, userId, userRole, triggeredBy = 'manual') => {
  const instance = await GetInstance(taskId);
  if (instance.isTerminal) {
    throw new APIError(400, 'Task is at a terminal stage. No further transitions allowed.');
  }

  const definition = instance.definition.definition;
  const transition = ValidateTransition(definition, instance.currentStage, toStage, userRole, { note, attachmentUrl, referenceLink }, triggeredBy);

  const fromStage = instance.currentStage;
  const isTerminal = definition.terminalStages.includes(toStage);

  await prisma.$transaction(async (tx) => {
    await tx.workflowInstance.update({
      where: { id: instance.id },
      data: { currentStage: toStage, isTerminal },
    });

    await tx.workflowTransitionHistory.create({
      data: {
        instanceId:      instance.id,
        fromStage,
        toStage,
        transitionLabel: transition.label,
        performedBy:     userId,
        note,
        attachmentUrl,
        triggeredBy,
      },
    });

    await tx.workflowSLATracking.updateMany({
      where: { instanceId: instance.id, exitedAt: null },
      data: { exitedAt: new Date() },
    });

    if (!isTerminal) {
      await tx.workflowSLATracking.create({
        data: {
          instanceId: instance.id,
          stage: toStage,
          enteredAt: new Date(),
        },
      });
    }
  });

  if (definition.autoAssignRole) {
    const currentAssigneeId = await AutoAssign(definition.autoAssignRole, toStage);
    await prisma.workflowInstance.update({
      where: { id: instance.id },
      data: { currentAssigneeId },
    });
  }

  PublishWorkflowTransitioned(taskId, fromStage, toStage, userId, isTerminal);

  return GetInstance(taskId);
};

const GetAvailableTransitions = async (taskId, userRole) => {
  const instance = await GetInstance(taskId);
  const definition = instance.definition.definition;

  const availableTransitions = definition.transitions.filter((t) =>
    t.from === instance.currentStage &&
    t.allowedRoles.includes(userRole) &&
    !t.githubTrigger
  ).map((t) => ({
    to: t.to,
    label: t.label,
    requiresNote: t.requiresNote || false,
    requiresAttachment: t.requiresAttachment || false,
    requiresReferenceLink: t.requiresReferenceLink || false,
  }));

  return availableTransitions;
};

module.exports = {
  CreateInstance,
  GetInstance,
  TransitionStage,
  GetAvailableTransitions,
};