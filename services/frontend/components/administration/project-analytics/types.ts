// Shared types + helpers for the Project Analytics Dashboard.
// Ported VERBATIM from OLD app/routes/administration/project-management/project-analytics.tsx.

export type Project = { _id: string; title: string };
export type Workspace = { _id: string; name: string };

export interface AnalyticsData {
  projectId: string
  projectName: string
  projectDescription: string
  projectHead: { userId: string; name: string; email: string } | null
  projectHeads?: Array<{ userId: string; name: string; email: string }>
  dateRange: { start: string; end: string; days: number; daysPassed: number; daysRemaining: number }
  health: {
    overallScore: number
    grade: string
    status: string
    components: { completion: number; quality: number; schedule: number; team: number }
  }
  completion: {
    rate: number
    velocity: number
    distribution: any
    pace: string
    totalTasks: number
    completedTasks: number
    pendingTasks: number
    inProgressTasks: number
    overdueTasks: number
  }
  timeline: {
    planned: string
    estimated: string
    delayDays: number
    delayPercentage: number
    spi: number
    extensions: number
    status: string
    expectedProgress: number
    actualProgress: number
  }
  quality: {
    score: number
    grade: string
    rejectionRate: number
    reworkRate: number
    approvalRate: number
    issues: string[]
  }
  team: {
    totalMembers: number
    activeMembers: number
    removedMembers: number
    productivityIndex: number
    contributions: Array<{
      userId: string
      name: string
      email: string
      role: string
      tasksAssigned: number
      tasksCompleted: number
      tasksPending: number
      contributionPercentage: number
      productivityScore: number
      qualityScore: number
    }>
    capacityUtilization: number
    turnoverRate: number
  }
  risk: {
    overallScore: number
    level: string
    scheduleRisk: { score: number; level: string; factors: any }
    qualityRisk: { score: number; level: string; factors: any }
    resourceRisk: { score: number; level: string; factors: any }
    predictedDelay: number
    indicators: string[]
    recommendations: string[]
  }
  trends: {
    completion: Array<{ date: string; value: number }>
    quality: Array<{ date: string; value: number }>
    riskScore: Array<{ date: string; value: number }>
    teamSize: Array<{ date: string; value: number }>
  }
  milestones: Array<{ name: string; planned: string; status: string; progress: number }>
  issues: Array<{ type: string; severity: string; description: string; impact: string; action: string }>
  comparison: {
    thisProject: any
    teamAverage: any
    variance: any
    betterWorse: { better: number; worse: number }
  }
}

export const COLORS = ['#10b981', '#3b82f6', '#ef4444', '#9333ea'];

export const getRiskColor = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'low': return 'bg-green-100 text-green-700 border-green-300'
    case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    case 'high': return 'bg-orange-100 text-orange-700 border-orange-300'
    case 'critical': return 'bg-red-100 text-red-700 border-red-300'
    default: return 'bg-gray-100 text-gray-700 border-gray-300'
  }
}

export const getStatusColor = (status: string) => {
  if (status.includes('On Track') || status.includes('Ahead')) return 'bg-green-100 text-green-700'
  if (status.includes('At Risk') || status.includes('Behind')) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}
