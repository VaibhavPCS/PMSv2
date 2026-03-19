const prisma         = require('../config/prisma');
const EmailService   = require('./email.service');
const { NOTIFICATION_TYPES } = require('@pms/constants');

const DispatchNotification = async (eventId, topic, event) => {
  switch (event.type) {

    case 'TASK_ASSIGNED': {
      const recipients = event.assigneeIds;  
      await _createBatch(eventId, recipients, {
        type:       NOTIFICATION_TYPES.TASK_ASSIGNED,
        title:      'You have been assigned a task',
        body:       `Task "${event.taskTitle}" has been assigned to you in project "${event.projectName}".`,
        entityType: 'task',
        entityId:   event.taskId,
      });
      await EmailService.SendTaskAssigned(event);
      break;
    }

    case 'TASK_STATUS_CHANGED': {
      await _createOne(eventId, event.createdBy, {
        type:       NOTIFICATION_TYPES.TASK_STATUS_CHANGED,
        title:      'Task status updated',
        body:       `Task "${event.taskTitle}" moved from ${event.fromStatus} to ${event.toStatus}.`,
        entityType: 'task',
        entityId:   event.taskId,
      });
      break;
    }

    case 'TASK_APPROVED': {
      await _createBatch(eventId, event.assigneeIds, {
        type:       NOTIFICATION_TYPES.TASK_APPROVED,
        title:      'Task approved ✅',
        body:       `Task "${event.taskTitle}" has been approved.`,
        entityType: 'task',
        entityId:   event.taskId,
      });
      await EmailService.SendTaskApproved(event);
      break;
    }

    case 'TASK_REJECTED': {
      await _createOne(eventId, event.rejectTo, {
        type:       NOTIFICATION_TYPES.TASK_REJECTED,
        title:      'Task sent back to you',
        body:       `Task "${event.taskTitle}" was rejected. Reason: ${event.reason}`,
        entityType: 'task',
        entityId:   event.taskId,
      });
      await EmailService.SendTaskRejected(event);
      break;
    }

    case 'PROJECT_MEMBER_ADDED': {
      await _createOne(eventId, event.userId, {
        type:       NOTIFICATION_TYPES.PROJECT_MEMBER_ADDED,
        title:      'You were added to a project',
        body:       `You have been added to project "${event.projectName}" as ${event.role}.`,
        entityType: 'project',
        entityId:   event.projectId,
      });
      break;
    }
    default:
      break;
  }
};

const _createOne = async (eventId, userId, fields) => {
  try {
    await prisma.notification.create({
      data: { ...fields, userId, eventId },
    });
  } catch (err) {
    if (err.code === 'P2002') return;  
    throw err;
  }
};

const _createBatch = async (eventId, userIds, fields) => {
  await Promise.allSettled(
    userIds.map((userId, i) =>
      _createOne(`${eventId}:${i}`, userId, fields),
    ),
  );
};

module.exports = { DispatchNotification };