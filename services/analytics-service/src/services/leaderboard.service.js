const prisma = require('../config/prisma');

// ============================================================================
// LEADERBOARD SERVICE — keeps LeaderboardEntry rows in sync with EmployeeMetric.
//
// After an employee metric row is recomputed, we mirror its headline figures
// into the (workspaceId, userId) leaderboard row and re-rank the workspace by
// productivityScore desc. The REST API then only reads + orders by `rank`.
//
// Re-ranking touches one workspace's rows (bounded by team size), staying well
// within the async-aggregation contract: this runs inside the Kafka consumer,
// never in an HTTP handler.
// ============================================================================

// Mirror one employee's current metrics into their leaderboard row.
const upsertEntry = async (employee) => {
  if (!employee || !employee.workspaceId || !employee.userId) return;
  const { workspaceId, userId } = employee;

  const fields = {
    completedCount: employee.completedCount || 0,
    approvalRate: employee.approvalRate || 0,
    onTimeCompletionRate: employee.onTimeCompletionRate || 0,
    productivityScore: employee.productivityScore || 0,
  };

  await prisma.leaderboardEntry.upsert({
    where: { workspaceId_userId: { workspaceId, userId } },
    create: { workspaceId, userId, ...fields },
    update: fields,
  });
};

// Re-rank an entire workspace by productivityScore (tie-break: completedCount).
const rerankWorkspace = async (workspaceId) => {
  if (!workspaceId) return;
  const rows = await prisma.leaderboardEntry.findMany({
    where: { workspaceId },
    orderBy: [{ productivityScore: 'desc' }, { completedCount: 'desc' }],
    select: { id: true, rank: true },
  });

  // Only write rows whose rank actually changed, to minimize churn.
  const updates = [];
  rows.forEach((row, idx) => {
    const rank = idx + 1;
    if (row.rank !== rank) {
      updates.push(prisma.leaderboardEntry.update({ where: { id: row.id }, data: { rank } }));
    }
  });
  if (updates.length) await prisma.$transaction(updates);
};

// Public entry: sync one employee then re-rank their workspace.
const apply = async (employee) => {
  if (!employee) return;
  await upsertEntry(employee);
  await rerankWorkspace(employee.workspaceId);
};

module.exports = { apply, upsertEntry, rerankWorkspace };
