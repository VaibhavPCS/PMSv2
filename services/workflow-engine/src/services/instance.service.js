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

  return prisma.$transaction(async (tx) => {
    const instance = await tx.workflowInstance.create({
      data: {
        taskId,
        workflowDefinitionId,
        currentStage: definition.definition.initialStage,
        createdBy,
      },
    });

    await tx.workflowSLATracking.create({
      data: {
        instanceId: instance.id,
        stage:      definition.definition.initialStage,
        enteredAt:  new Date(),
      },
    });

    return instance;
  });
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
  const transitionResult = await prisma.$transaction(async (tx) => {
    const instance = await tx.workflowInstance.findUnique({
      where: { taskId },
      include: { definition: true },
    });

    if (!instance) {
      throw new APIError(404, 'Workflow instance not found for the given task.');
    }

    if (instance.isTerminal) {
      throw new APIError(400, 'Task is at a terminal stage. No further transitions allowed.');
    }

    const definition = instance.definition.definition;
    const transition = ValidateTransition(definition, instance.currentStage, toStage, userRole, { note, attachmentUrl, referenceLink }, triggeredBy);
    const fromStage = instance.currentStage;
    const isTerminal = definition.terminalStages.includes(toStage);

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
        referenceLink,
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

    return {
      instanceId: instance.id,
      definition,
      fromStage,
      isTerminal,
    };
  });

  if (transitionResult.definition.autoAssignRole) {
    const currentAssigneeId = await AutoAssign(transitionResult.definition.autoAssignRole, toStage);
    await prisma.workflowInstance.update({
      where: { id: transitionResult.instanceId },
      data: { currentAssigneeId },
    });
  }

  await PublishWorkflowTransitioned(taskId, transitionResult.fromStage, toStage, userId, transitionResult.isTerminal)
    .catch((err) => console.error('[workflow-engine] failed to publish transition event', { taskId, fromStage: transitionResult.fromStage, toStage, userId, error: err.message }));

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