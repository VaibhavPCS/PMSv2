const { TASK_STATUS, PROJECT_STATUS, DAY_MS, HOUR_MS } = require('@pms/constants');

const CalculateTaskCounts = (tasks = []) => {
    const counts = Object.values(TASK_STATUS).reduce((acc, status) => {
        acc[status] = 0;
        return acc;
    }, {});

    tasks.forEach((task) => {
        const status = task?.status;
        if (status && Object.prototype.hasOwnProperty.call(counts, status)) {
            counts[status] += 1;
        }
    });

    counts.total = tasks.length;
    return counts;
};

const CalculateApprovalMetrics = (history = []) => {
    const approved = history.filter((h) => h.eventType === TASK_STATUS.APPROVED).length;
    const rejected = history.filter((h) => h.eventType === TASK_STATUS.REJECTED).length;
    const total = approved + rejected;
    const taskRejectionMap = history.reduce((acc, h) => {
        if (h.eventType === TASK_STATUS.REJECTED && h.taskId) {
            acc[h.taskId] = true;
        }
        return acc;
    }, {});
    const firstTimeRight = history.filter(
        (h) => h.eventType === TASK_STATUS.APPROVED && !taskRejectionMap[h.taskId]
    ).length;
    return {
        approved,
        rejected,
        approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
        firstTimeRightRate: approved > 0 ? Math.round((firstTimeRight / approved) * 100) : 0,
    };
};

const CalculateTimeMetrics = (tasks = []) => {
    const completedTasks = tasks.filter((t) => t.completedAt && t.createdAt);

    const avgTimeToComplete = completedTasks.length > 0
        ? completedTasks.reduce((sum, t) => {
            return sum + (new Date(t.completedAt) - new Date(t.createdAt));
        }, 0) / completedTasks.length / HOUR_MS
        : 0;

    const reviewTasks = tasks.filter((t) => t.reviewStartedAt && t.completedAt);
    const avgTimeInReview = reviewTasks.length > 0
        ? reviewTasks.reduce((sum, t) => {
            return sum + (new Date(t.completedAt) - new Date(t.reviewStartedAt));
        }, 0) / reviewTasks.length / HOUR_MS
        : 0;

    const blockedTasks = tasks.filter((t) => t.holdDuration > 0);
    const avgTimeBlocked = blockedTasks.length > 0
        ? blockedTasks.reduce((sum, t) => sum + t.holdDuration, 0) / blockedTasks.length / HOUR_MS
        : 0;

    return {
        avgTimeToComplete: Math.round(avgTimeToComplete * 10) / 10,
        avgTimeInReview: Math.round(avgTimeInReview * 10) / 10,
        avgTimeBlocked: Math.round(avgTimeBlocked * 10) / 10,
    };
};

const CalculateQualityMetrics = (tasks = []) => {
    if (tasks.length === 0) {
        return { rejectionRate: 0, overdueRate: 0, reworkRate: 0 };
    }

    const rejectedTasks = tasks.filter(
        (t) => t.status === TASK_STATUS.REJECTED || (t.rejectionCount && t.rejectionCount > 0)
    ).length;

    const now = Date.now();
    const overdueTasks = tasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== TASK_STATUS.COMPLETED
    ).length;

    const reworkTasks = tasks.filter(
        (t) => t.rejectionCount && t.rejectionCount > 1
    ).length;

    return {
        rejectionRate: Math.round((rejectedTasks / tasks.length) * 100),
        overdueRate: Math.round((overdueTasks / tasks.length) * 100),
        reworkRate: Math.round((reworkTasks / tasks.length) * 100),
    };
};

const CalculateProductivityScore = (counts = {}, time = {}, quality = {}) => {
    const total = counts.total || 0;
    const completed = counts[TASK_STATUS.COMPLETED] || 0;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const avgHours = time.avgTimeToComplete || 0;
    const speedScore = avgHours === 0 ? 50
        : avgHours <= 24 ? 100
            : avgHours >= 72 ? 0
                : Math.round(((72 - avgHours) / 48) * 100);
    const qualityScore = Math.max(
        0,
        100 - (quality.rejectionRate || 0) - (quality.overdueRate || 0) - (quality.reworkRate || 0)
    );

    const score = Math.round(
        (completionRate * 0.40) +
        (speedScore * 0.20) +
        (qualityScore * 0.40)
    );

    return Math.min(100, Math.max(0, score));
};

const CalculateVelocityTimeSeries = (tasks = [], periodDays = 1) => {
    const completedTasks = tasks.filter((t) => t.completedAt);

    const buckets = completedTasks.reduce((acc, task) => {
        const completedDate = new Date(task.completedAt);
        const bucketTime = Math.floor(completedDate.getTime() / (periodDays * DAY_MS)) * (periodDays * DAY_MS);
        const dateKey = new Date(bucketTime).toISOString().split('T')[0];

        acc[dateKey] = (acc[dateKey] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(buckets)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
};

const CalculateProjectStatus = (project = {}, tasks = []) => {
    const counts = CalculateTaskCounts(tasks);
    const total = counts.total;
    const completed = counts[TASK_STATUS.COMPLETED] || 0;

    if (total === 0) return PROJECT_STATUS.ON_TRACK;

    if (completed === total) return PROJECT_STATUS.COMPLETED;

    const completionRate = completed / total;
    const now = Date.now();
    const start = new Date(project.startDate).getTime();
    const due = new Date(project.dueDate).getTime();
    const totalDuration = due - start;
    const elapsed = now - start;

    if (now > due) return PROJECT_STATUS.OFF_TRACK;

    const timeProgress = totalDuration > 0 ? elapsed / totalDuration : 0;

    const gap = timeProgress - completionRate;

    if (gap >= 0.40) return PROJECT_STATUS.OFF_TRACK;
    if (gap >= 0.20) return PROJECT_STATUS.AT_RISK;
    return PROJECT_STATUS.ON_TRACK;
};


const CalculateWorkloadDistribution = (members = [], tasks = []) => {
    const countMap = tasks.reduce((acc, task) => {
        const assignee = task.assignee?.toString() || task.assignee;
        if (assignee) {
            acc[assignee] = (acc[assignee] || 0) + 1;
        }
        return acc;
    }, {});

    const total = tasks.length || 1; 

    return members
        .map((member) => {
            const userId = member.userId?.toString() || member._id?.toString();
            const taskCount = countMap[userId] || 0;
            return {
                userId,
                name: member.name || 'Unknown',
                taskCount,
                percentage: Math.round((taskCount / total) * 100),
            };
        })
        .sort((a, b) => b.taskCount - a.taskCount);
};

module.exports = {
    CalculateTaskCounts,
    CalculateApprovalMetrics,
    CalculateTimeMetrics,
    CalculateQualityMetrics,
    CalculateProductivityScore,
    CalculateVelocityTimeSeries,
    CalculateProjectStatus,
    CalculateWorkloadDistribution,
};
