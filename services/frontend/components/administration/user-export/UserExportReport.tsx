'use client';

// Printable report (sections 1-10) for the User Productivity Export screen.
// JSX copied VERBATIM from OLD user-export.tsx (the #printable-area block).
// Caller: UserExportView.tsx.

import type { ReportData } from './types';

interface UserExportReportProps {
  reportData: ReportData;
  canDownload: boolean;
  download: (format: 'excel' | 'pdf') => void;
}

export function UserExportReport({ reportData, canDownload, download }: UserExportReportProps) {
  return (
    <div id="printable-area" className="space-y-6">
      {/* Section 1: User Info Card */}
      <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#F2761B] text-white flex items-center justify-center text-2xl font-semibold flex-shrink-0">
            {reportData.user?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] md:text-[20px] font-semibold text-[#111827] truncate">{reportData.user?.name || 'Unknown User'}</h2>
            <p className="text-[13px] text-[#717182] truncate">{reportData.user?.email || 'No email'}</p>
            <p className="text-[13px] text-[#717182] capitalize">{reportData.user?.role || 'No role'}</p>
          </div>
          <div className="w-full sm:w-auto sm:text-right">
            <p className="text-[13px] text-[#717182]">Selected Period</p>
            <p className="text-[14px] font-medium text-[#111827]">{reportData.dateRange.displayText}</p>
            <p className="text-[13px] text-[#717182]">{reportData.dateRange.days} days</p>
          </div>
        </div>
      </div>

      {/* Section 2: Summary Statistics (4 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#717182] mb-1">Total Tasks</p>
              <p className="text-[28px] font-bold text-[#111827]">{reportData.summary?.totalTasks ?? 0}</p>
              <p className="text-[12px] text-[#717182] mt-1">100%</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl">
              📋
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#10b981] mb-1">Completed</p>
              <p className="text-[28px] font-bold text-[#10b981]">{reportData.summary?.completedTasks ?? 0}</p>
              <p className="text-[12px] text-[#10b981] mt-1">{reportData.summary?.completionRate ?? 0}%</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl">
              ✅
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#f59e0b] mb-1">In Progress</p>
              <p className="text-[28px] font-bold text-[#f59e0b]">{reportData.summary?.openTasks ?? 0}</p>
              <p className="text-[12px] text-[#f59e0b] mt-1">{(reportData.summary?.totalTasks ?? 0) > 0 ? Math.round(((reportData.summary?.openTasks ?? 0) / (reportData.summary?.totalTasks ?? 1)) * 100) : 0}%</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-2xl">
              ⏳
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#ef4444] mb-1">Overdue</p>
              <p className="text-[28px] font-bold text-[#ef4444]">{reportData.summary?.overdueTasks ?? 0}</p>
              <p className="text-[12px] text-[#ef4444] mt-1">{(reportData.summary?.totalTasks ?? 0) > 0 ? Math.round(((reportData.summary?.overdueTasks ?? 0) / (reportData.summary?.totalTasks ?? 1)) * 100) : 0}%</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl">
              ⚠️
            </div>
          </div>
        </div>
      </div>

      {/* Section 3 & 4: Tables side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 3: Completed Tasks Table */}
        <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-5 shadow-sm">
          <h3 className="text-[16px] font-semibold text-[#111827] mb-4">
            ✅ Completed Tasks ({(reportData.completedTasks?.length ?? 0)})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#e6e8ec]">
                  <th className="text-left py-2 px-2 font-semibold text-[#111827]">Task</th>
                  <th className="text-left py-2 px-2 font-semibold text-[#111827]">Project</th>
                  <th className="text-left py-2 px-2 font-semibold text-[#111827]">Completed</th>
                  <th className="text-left py-2 px-2 font-semibold text-[#111827]">Priority</th>
                </tr>
              </thead>
              <tbody>
                {(reportData.completedTasks?.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-[#717182]">No completed tasks</td>
                  </tr>
                ) : (
                  (reportData.completedTasks || []).slice(0, 10).map((task, idx) => (
                    <tr key={task.id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-2 px-2 text-[#111827]">{task.title}</td>
                      <td className="py-2 px-2 text-[#717182]">{task.project}</td>
                      <td className="py-2 px-2 text-[#717182]">{task.completedAt}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-1 rounded text-[11px] font-medium ${task.priority === 'urgent' ? 'bg-red-100 text-red-700' : task.priority === 'high' ? 'bg-orange-100 text-orange-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                          {task.priority}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Due Tasks Table */}
        <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-5 shadow-sm">
          <h3 className="text-[16px] font-semibold text-[#111827] mb-4">
            ⏰ Due in Range ({(reportData.openTasks?.length ?? 0)})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#e6e8ec]">
                  <th className="text-left py-2 px-2 font-semibold text-[#111827]">Task</th>
                  <th className="text-left py-2 px-2 font-semibold text-[#111827]">Project</th>
                  <th className="text-left py-2 px-2 font-semibold text-[#111827]">Due Date</th>
                  <th className="text-left py-2 px-2 font-semibold text-[#111827]">Status</th>
                </tr>
              </thead>
              <tbody>
                {(reportData.openTasks?.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-[#717182]">No open tasks</td>
                  </tr>
                ) : (
                  (reportData.openTasks || []).slice(0, 10).map((task, idx) => (
                    <tr key={task.id} className={`${idx % 2 === 0 ? 'bg-gray-50' : ''} ${task.isOverdue ? 'bg-red-50' : ''}`}>
                      <td className="py-2 px-2 text-[#111827]">{task.title}</td>
                      <td className="py-2 px-2 text-[#717182]">{task.project}</td>
                      <td className="py-2 px-2 text-[#717182]">{task.dueDate}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-1 rounded text-[11px] font-medium ${task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 5: Weekly Breakdown */}
      <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-6 shadow-sm">
        <h3 className="text-[18px] font-semibold text-[#111827] mb-4">📊 Weekly Breakdown</h3>
        <div className="space-y-3">
          {(reportData.weekly || []).map((week) => (
            <div key={week.week}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-medium text-[#111827]">
                  Week {week.week} ({week.startDate} - {week.endDate})
                </span>
                <span className="text-[13px] font-semibold text-[#F2761B]">{week.completed} tasks</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6">
                <div
                  className="bg-[#F2761B] h-6 rounded-full flex items-center justify-end pr-2 text-white text-[11px] font-medium"
                  style={{ width: `${week.percentage}%` }}
                >
                  {week.percentage > 10 && `${week.percentage}%`}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-[#e6e8ec] grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-[13px] text-[#717182]">Total</p>
            <p className="text-[16px] font-bold text-[#111827]">{reportData.summary?.completedTasks ?? 0} tasks</p>
          </div>
          <div>
            <p className="text-[13px] text-[#717182]">Peak Week</p>
            <p className="text-[16px] font-bold text-[#F2761B]">Week {(reportData.weekly || []).reduce((max, w) => w.completed > max.completed ? w : max, (reportData.weekly || [])[0] || {})?.week || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[13px] text-[#717182]">Average</p>
            <p className="text-[16px] font-bold text-[#111827]">{(reportData.summary?.completedTasks && reportData.weekly?.length ? (reportData.summary.completedTasks / reportData.weekly.length).toFixed(1) : '0.0')} tasks/week</p>
          </div>
        </div>
      </div>

      {/* Section 6: Performance Score Card */}
      <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-[12px] p-6 text-white shadow-lg">
        <h3 className="text-[20px] font-bold mb-4">⭐ Productivity Score</h3>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[48px] font-bold">{reportData.performanceScore?.overallScore ?? 0}</p>
            <p className="text-[16px] opacity-90">/ 100</p>
          </div>
          <div className="text-right">
            <p className="text-[32px] font-bold">{reportData.performanceScore?.grade ?? '-'}</p>
            <p className="text-[14px] opacity-90">{reportData.performanceScore?.status ?? 'Not Available'}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[13px]">Completion</span>
              <span className="text-[13px] font-semibold">{reportData.performanceScore?.components?.completion ?? 0}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className="bg-white h-2 rounded-full" style={{ width: `${reportData.performanceScore?.components?.completion ?? 0}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[13px]">On-Time</span>
              <span className="text-[13px] font-semibold">{reportData.performanceScore?.components?.onTime ?? 0}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className="bg-white h-2 rounded-full" style={{ width: `${reportData.performanceScore?.components?.onTime ?? 0}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[13px]">Diversity</span>
              <span className="text-[13px] font-semibold">{reportData.performanceScore?.components?.diversity ?? 0}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className="bg-white h-2 rounded-full" style={{ width: `${reportData.performanceScore?.components?.diversity ?? 0}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[13px]">Consistency</span>
              <span className="text-[13px] font-semibold">{reportData.performanceScore?.components?.consistency ?? 0}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className="bg-white h-2 rounded-full" style={{ width: `${reportData.performanceScore?.components?.consistency ?? 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Section 7: Efficiency Metrics */}
      <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-6 shadow-sm">
        <h3 className="text-[18px] font-semibold text-[#111827] mb-4">⚡ Efficiency Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-[8px] p-4">
            <p className="text-[13px] text-[#717182] mb-1">Avg Time to Complete</p>
            <p className="text-[24px] font-bold text-[#111827]">{reportData.timing?.avgTimeToComplete ?? 0}</p>
            <p className="text-[12px] text-[#717182]">days</p>
          </div>
          <div className="bg-gray-50 rounded-[8px] p-4">
            <p className="text-[13px] text-[#717182] mb-1">Fastest Completion</p>
            <p className="text-[16px] font-bold text-[#10b981]">{reportData.timing?.fastestCompletion || 'N/A'}</p>
            <p className="text-[12px] text-[#717182]">days</p>
          </div>
          <div className="bg-gray-50 rounded-[8px] p-4">
            <p className="text-[13px] text-[#717182] mb-1">Slowest Completion</p>
            <p className="text-[16px] font-bold text-[#ef4444]">{reportData.timing?.slowestCompletion || 'N/A'}</p>
            <p className="text-[12px] text-[#717182]">days</p>
          </div>
          <div className="bg-gray-50 rounded-[8px] p-4">
            <p className="text-[13px] text-[#717182] mb-1">Peak Productivity Day</p>
            <p className="text-[16px] font-bold text-[#F2761B]">{reportData.peakDay || 'N/A'}</p>
            <p className="text-[12px] text-[#717182]">{reportData.peakDayCount ?? 0} completions</p>
          </div>
          <div className="bg-gray-50 rounded-[8px] p-4">
            <p className="text-[13px] text-[#717182] mb-1">Avg Tasks/Day</p>
            <p className="text-[24px] font-bold text-[#111827]">{reportData.timing?.tasksPerDay ?? 0}</p>
            <p className="text-[12px] text-[#717182]">tasks</p>
          </div>
          <div className="bg-gray-50 rounded-[8px] p-4">
            <p className="text-[13px] text-[#717182] mb-1">Productivity Trend</p>
            <p className="text-[14px] font-bold text-[#111827]">{reportData.productivityTrend || 'Stable'}</p>
          </div>
        </div>
      </div>

      {/* Section 8: Project Breakdown */}
      <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-6 shadow-sm">
        <h3 className="text-[18px] font-semibold text-[#111827] mb-4">📁 Project Breakdown</h3>
        <div className="space-y-3">
          {(reportData.projects?.length ?? 0) === 0 ? (
            <p className="text-center text-[#717182] py-4">No projects</p>
          ) : (
            (reportData.projects || []).map((proj, idx) => (
              <div key={idx} className="border border-[#e6e8ec] rounded-[8px] p-4">
                <p className="text-[15px] font-semibold text-[#111827] mb-2">{proj.projectName}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[13px]">
                  <div>
                    <p className="text-[#717182]">Tasks</p>
                    <p className="font-semibold text-[#111827]">{proj.assigned} assigned, {proj.completed} done</p>
                  </div>
                  <div>
                    <p className="text-[#717182]">Completion Rate</p>
                    <p className="font-semibold text-[#F2761B]">{proj.completionRate}%</p>
                  </div>
                  <div>
                    <p className="text-[#717182]">On-Time Rate</p>
                    <p className="font-semibold text-[#10b981]">{proj.onTimeRate}%</p>
                  </div>
                  <div>
                    <p className="text-[#717182]">Your Contribution</p>
                    <p className="font-semibold text-[#111827]">{proj.contribution}%</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Section 9: Team Comparison */}
      <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-6 shadow-sm">
        <h3 className="text-[18px] font-semibold text-[#111827] mb-4">👥 Team Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#e6e8ec]">
                <th className="text-left py-2 px-2 font-semibold text-[#111827]">Metric</th>
                <th className="text-left py-2 px-2 font-semibold text-[#111827]">You</th>
                <th className="text-left py-2 px-2 font-semibold text-[#111827]">Team Avg</th>
                <th className="text-left py-2 px-2 font-semibold text-[#111827]">Gap</th>
              </tr>
            </thead>
            <tbody>
              {(reportData.comparison || []).map((comp, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="py-2 px-2 text-[#111827]">{comp.metric}</td>
                  <td className="py-2 px-2 font-semibold text-[#111827]">{comp.yourScore}</td>
                  <td className="py-2 px-2 text-[#717182]">{comp.teamAverage}</td>
                  <td className="py-2 px-2">
                    <span className={`font-semibold ${comp.better ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      {comp.better ? '✅' : '❌'} {comp.gap}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* <div className="mt-4 p-4 bg-green-50 rounded-[8px] border border-green-200">
          <p className="text-[14px] text-green-800 font-medium text-center">
            {(reportData.comparison || []).filter(c => c.better).length >= (reportData.comparison?.length ?? 0) / 2
              ? '✨ You\'re performing ABOVE AVERAGE compared to your team!'
              : '💪 Keep pushing! You have room for improvement.'}
          </p>
        </div> */}
      </div>

      {/* Section 10: Export Options Panel (Sticky) */}
      <div className="sticky bottom-6 bg-white rounded-[10px] border-2 border-[#F2761B] p-4 shadow-lg no-print">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-[15px] font-semibold text-[#111827]">📊 Export Options</p>
            <p className="text-[12px] text-[#717182]">Download complete report data</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => download('excel')}
              disabled={!canDownload}
              className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 bg-[#F2761B] hover:bg-[#F2761B]/90 text-white px-[16px] py-[10px] rounded-[8px] text-[13px] font-medium flex items-center gap-2"
            >
              📥 Excel
            </button>
            <button
              onClick={() => window.print()}
              className="justify-center whitespace-nowrap transition-all bg-gray-200 hover:bg-gray-300 text-gray-800 px-[16px] py-[10px] rounded-[8px] text-[13px] font-medium flex items-center gap-2"
            >
              🖨️ Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
