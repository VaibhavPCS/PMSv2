const { CreateConsumer, SubscribeToTopics, CreateProducer, PublishEvent } = require('@pms/kafka');
const { TOPICS } = require('@pms/constants');
const prisma = require('../config/prisma');
const Lifecycle = require('../services/task-lifecycle.service');
const EmployeeMetrics = require('../services/employee-metrics.service');
const ProjectMetrics = require('../services/project-metrics.service');
const WorkspaceMetrics = require('../services/workspace-metrics.service');
const Leaderboard = require('../services/leaderboard.service');

// Domain handlers that incrementally update the current-state metric tables
// (EmployeeMetric, ProjectMetric, WorkspaceMetric, LeaderboardEntry,
// TaskLifecycleStat) live in ../services/*. This file owns consumer lifecycle +
// idempotency + retry/DLQ + the event→aggregator router, mirroring
// notification-service.

let _producer = null;

const getProducer = async () => {
  if (!_producer) {
    _producer = CreateProducer([process.env.KAFKA_BROKER]);
  }

  const localRef = _producer;
  try {
    return await localRef;
  } catch (err) {
    if (_producer === localRef) {
      _producer = null;
    }
    throw err;
  }
};

const StartConsumers = async () => {
  const broker = process.env.KAFKA_BROKER;

  if (!broker) {
    const error = new Error('KAFKA_BROKER is required to start analytics consumers.');
    console.error('[analytics-service] Failed to start Kafka consumer:', error.message);
    throw error;
  }

  try {
    const consumer = await CreateConsumer([broker], 'analytics-service');
    // Subscribe to the domain topics whose events drive metric updates.
    const subscribed = [
      TOPICS.TASK_EVENTS,
      TOPICS.SPRINT_EVENTS,
      TOPICS.PROJECT_EVENTS,
      TOPICS.WORKSPACE_EVENTS,
      TOPICS.WORKFLOW_EVENTS,
    ];
    await SubscribeToTopics(consumer, subscribed, handleEvent);
    console.log('[analytics-service] Kafka consumer started and subscribed to topics');
    return consumer;
  } catch (err) {
    console.error('[analytics-service] Failed to initialize Kafka consumer:', err.message);
  }
};

const handleEvent = async ({ topic, key, value }) => {
  const maxAttempts = 3;
  const eventId = value?.eventId || key;

  try {
    // Idempotency: skip events already applied to incremental metric tables.
    if (eventId) {
      const seen = await prisma.processedEvent.findUnique({ where: { eventId } });
      if (seen) {
        console.log(`[analytics-service] Skipping already-processed event ${eventId}`);
        return;
      }
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await routeEvent(topic, key, value);
        if (eventId) {
          await prisma.processedEvent.create({ data: { eventId, topic, jobType: value?.type || null } });
        }
        console.log(`[analytics-service] Applied event ${key} on topic ${topic}`);
        return;
      } catch (err) {
        if (attempt === maxAttempts) throw err;
        const backoffMs = 200 * (2 ** (attempt - 1));
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  } catch (err) {
    const dlqTopic = process.env.ANALYTICS_DLQ_TOPIC || 'pms.analytics.dlq';

    try {
      const producer = await getProducer();
      await PublishEvent(producer, dlqTopic, key || 'unknown', {
        topic,
        key,
        value,
        error: err.message,
        failedAt: new Date().toISOString(),
      });
    } catch (dlqErr) {
      console.error('[analytics-service] Failed to publish to DLQ:', {
        topic, key, error: dlqErr.message, payloadPresent: value !== undefined,
      });
      throw err;
    }

    console.error('[analytics-service] Failed to apply event after retries:', {
      topic, key, error: err.message, payloadPresent: value !== undefined,
    });
  }
};

// Apply a lifecycle transition ({ prev, next } task states) to every rollup that
// depends on per-task state: employee + leaderboard, project, workspace.
const fanOutTransition = async (transition) => {
  if (!transition || (!transition.prev && !transition.next)) return;
  // Employee row is recomputed first; its result seeds the leaderboard.
  const employee = await EmployeeMetrics.applyTransition(transition);
  if (employee) await Leaderboard.apply(employee);
  await ProjectMetrics.applyTransition(transition);
  await WorkspaceMetrics.applyTransition(transition);
};

// Router: maps a domain event to the metric updater(s) it should drive.
// Concrete updaters live in ../services/* (kept out of this lifecycle file to
// respect the <1000 LOC rule and keep concerns separate).
const routeEvent = async (topic, key, value) => {
  if (!value || !value.type) return;
  const type = value.type;

  switch (topic) {
    case TOPICS.TASK_EVENTS: {
      if (type === 'TASK_CREATED') return fanOutTransition(await Lifecycle.onTaskCreated(value));
      if (type === 'TASK_STATUS_CHANGED') return fanOutTransition(await Lifecycle.onTaskStatusChanged(value));
      if (type === 'TASK_OVERDUE') return fanOutTransition(await Lifecycle.onTaskOverdue(value));
      if (type === 'TASK_DELETED') return fanOutTransition(await Lifecycle.onTaskDeleted(value));
      return undefined;
    }

    case TOPICS.WORKFLOW_EVENTS: {
      if (type === 'WORKFLOW_STAGE_CHANGED') return fanOutTransition(await Lifecycle.onWorkflowStageChanged(value));
      return undefined; // SLA breach / auto-assign-failed do not move metrics
    }

    case TOPICS.PROJECT_EVENTS: {
      if (type === 'PROJECT_CREATED') {
        await ProjectMetrics.onProjectCreated(value);
        return WorkspaceMetrics.onProjectCreated(value);
      }
      if (type === 'PROJECT_DELETED') {
        await WorkspaceMetrics.onProjectDeleted(value);
        return ProjectMetrics.onProjectDeleted(value);
      }
      return undefined; // member/role/deadline changes: no current-state metric
    }

    case TOPICS.WORKSPACE_EVENTS: {
      if (type === 'MEMBER_ADDED') return WorkspaceMetrics.onMemberAdded(value);
      if (type === 'MEMBER_REMOVED') return WorkspaceMetrics.onMemberRemoved(value);
      return undefined;
    }

    case TOPICS.SPRINT_EVENTS: {
      if (type === 'SPRINT_CREATED') return WorkspaceMetrics.onSprintCreated(value);
      if (type === 'SPRINT_DELETED') return WorkspaceMetrics.onSprintDeleted(value);
      return undefined;
    }

    default:
      return undefined;
  }
};

module.exports = { StartConsumers };
