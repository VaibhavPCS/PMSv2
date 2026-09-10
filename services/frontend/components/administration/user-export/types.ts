// Shared types for the User Productivity Export screen.
// Ported VERBATIM from OLD app/routes/administration/project-management/user-export.tsx.

export type Employee = { userId: string; userName: string };

export interface ReportData {
  user: {
    id: string
    name: string
    email: string
    role: string
    profilePicture: string | null
  }
  dateRange: {
    start: string
    end: string
    days: number
    displayText: string
  }
  summary: {
    totalTasks: number
    completedTasks: number
    openTasks: number
    overdueTasks: number
    completionRate: number
  }
  timing: {
    avgTimeToComplete: number
    fastestCompletion: string | null
    slowestCompletion: string | null
    onTimeRate: number
    tasksPerDay: number
  }
  weekly: Array<{
    week: number
    startDate: string
    endDate: string
    completed: number
    percentage: number
    onTime: number
  }>
  performanceScore: {
    overallScore: number
    grade: string
    status: string
    components: {
      completion: number
      onTime: number
      diversity: number
      consistency: number
    }
  }
  completedTasks: Array<{
    id: string
    title: string
    project: string
    completedAt: string
    priority: string
    daysToComplete: number
  }>
  openTasks: Array<{
    id: string
    title: string
    project: string
    dueDate: string
    priority: string
    status: string
    daysUntilDue: number
    isOverdue: boolean
  }>
  projects: Array<{
    projectName: string
    assigned: number
    completed: number
    completionRate: number
    onTimeRate: number
    contribution: number
  }>
  comparison: Array<{
    metric: string
    yourScore: string | number
    teamAverage: string | number
    better: boolean
    gap: string
  }>
  peakDay: string
  peakDayCount: number
  consistency: number
  productivityTrend: string
  efficiencyMetrics: {
    avgDaysToComplete: string
    fastestCompletion: string
    slowestCompletion: string
    peakDay: string
    peakDayCount: number
    tasksPerDay: string
    productivityTrend: string
  }
}
