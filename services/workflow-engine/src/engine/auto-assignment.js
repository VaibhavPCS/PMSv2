const AutoAssign = (projectMembers, targetRole, openTaskCounts) => {
  const candidates = projectMembers.filter((m) => m.role === targetRole && m.isActive);
  if (!candidates.length) return null;

  return candidates.reduce((best, current) => {
    const bestLoad    = openTaskCounts[best.userId]    ?? 0;
    const currentLoad = openTaskCounts[current.userId] ?? 0;
    return currentLoad < bestLoad ? current : best;
  }).userId;
};

module.exports = { AutoAssign };