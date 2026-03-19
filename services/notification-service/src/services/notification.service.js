const prisma = require('../config/prisma');
const EmailService = require('./email.service');
const { NOTIFICATION_TYPES } = require('@pms/constants');

const DispatchNotification = async (eventId, topic, event) => {
  try {
    switch (event.type) {
      case NOTIFICATION_TYPES.TASK_ASSIGNED: {
        const recipients = Array.isArray(event.assigneeIds) ? event.assigneeIds : [];

        if (recipients.length === 0) {
          console.warn(`Skipping TASK_ASSIGNED notification for event ${eventId}: no assigneeIds provided.`);
          return;
        }

        await _createBatch(
          eventId,
          recipients,
          {
            type: NOTIFICATION_TYPES.TASK_ASSIGNED,
            title: 'You have been assigned a new task',
            body: `Task "${event.taskTitle}" has been assigned to you.`,
            entityType: 'task',
            entityId: event.taskId,
          }
        );
        await EmailService.SendTaskAssigned(event);
        break;
      }

      case NOTIFICATION_TYPES.TASK_STATUS_CHANGED:
        await _createOne(
          eventId,
          event.createdBy,
          {
            type: NOTIFICATION_TYPES.TASK_STATUS_CHANGED,
            title: 'Task status updated',
            body: `The status of task "${event.taskTitle}" has been changed to ${event.newStatus}.`,
            entityType: 'task',
            entityId: event.taskId,
          }
        );
        break;

      case NOTIFICATION_TYPES.TASK_APPROVED: {
        const assigneeIds = Array.isArray(event.assigneeIds) ? event.assigneeIds : [];
        if (assigneeIds.length === 0) {
          console.warn(`Skipping TASK_APPROVED notification for event ${eventId}: no assigneeIds provided.`);
          return;
        }

        await _createBatch(
          eventId,
          assigneeIds,
          {
            type: NOTIFICATION_TYPES.TASK_APPROVED,
            title: 'Your task has been approved',
            body: `Task "${event.taskTitle}" has been approved.`,
            entityType: 'task',
            entityId: event.taskId,
          }
        );
        await EmailService.SendTaskApproved(event);
        break;
      }

      case NOTIFICATION_TYPES.TASK_REJECTED:
        await _createOne(
          eventId,
          event.rejectTo,
          {
            type: NOTIFICATION_TYPES.TASK_REJECTED,
            title: 'Your task has been rejected',
            body: `Task "${event.taskTitle}" has been rejected. Reason: ${event.reason}`,
            entityType: 'task',
            entityId: event.taskId,
          }
        );
        await EmailService.SendTaskRejected(event);
        break;

      case NOTIFICATION_TYPES.PROJECT_MEMBER_ADDED:
        await _createOne(
          eventId,
          event.userId,
          {
            type: NOTIFICATION_TYPES.PROJECT_MEMBER_ADDED,
            title: 'You have been added to a project',
            body: `You have been added to the project "${event.projectName}".`,
            entityType: 'project',
            entityId: event.projectId,
          }
        );
        break;

      case NOTIFICATION_TYPES.WORKFLOW_SLA_BREACHED:
        await _createOne(
          eventId,
          event.projectLeadId,
          {
            type: NOTIFICATION_TYPES.WORKFLOW_SLA_BREACHED,
            title: 'Workflow SLA breached',
            body: `The workflow "${event.workflowName}" has breached its SLA in project "${event.projectName}".`,
            entityType: 'project',
            entityId: event.projectId,
          }
        );
        break;

      case NOTIFICATION_TYPES.MEETING_CREATED: {
        const participantIds = Array.isArray(event.participantIds) ? event.participantIds : [];
        if (participantIds.length === 0) {
          console.warn(`Skipping MEETING_CREATED notification for event ${eventId}: no participantIds provided.`);
          return;
        }

        await _createBatch(
          eventId,
          participantIds,
          {
            type: NOTIFICATION_TYPES.MEETING_CREATED,
            title: 'New meeting scheduled',
            body: `A new meeting "${event.meetingTitle}" has been scheduled.`,
            entityType: 'meeting',
            entityId: event.meetingId,
          }
        );
        break;
      }
      default:
        console.warn(`Unrecognized event type: ${event.type}`);
        break;
    }
  } catch (error) {
    console.error('Error dispatching notification:', error);
  }
};

const _createOne = async (eventId, userId, fields) => {
  try {
    await prisma.notification.create({
      data: { ...fields, userId, eventId },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      console.warn(`Notification for event ${eventId} already exists for user ${userId}. Skipping duplicate.`);
      return;
    }
    throw error; 
  }
};

const _createBatch = async (eventId, userIds, fields) => {
  const results = await Promise.allSettled(
    userIds.map((userId) => _createOne(`${eventId}:${userId}`, userId, fields))
  );

  const failures = results
    .map((result, index) => ({ result, userId: userIds[index] }))
    .filter(({ result }) => result.status === 'rejected');

  if (failures.length > 0) {
    failures.forEach(({ result, userId }) => {
      console.error(`Failed to create notification for user ${userId} and event ${eventId}:`, result.reason);
    });

    throw new Error(`Failed to create ${failures.length} notification(s) for event ${eventId}.`);
  }
};

module.exports = {
  DispatchNotification,
};