'use client';

// Project Analytics — Detail sections (6-10): team performance table, trends
// line chart, milestones, issues & blockers, comparative analytics.
// JSX + recharts config copied VERBATIM from OLD project-analytics.tsx.
// Caller: ProjectAnalyticsView.tsx.

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import type { AnalyticsData } from './types';

export function ProjectAnalyticsDetails({ analytics }: { analytics: AnalyticsData }) {
  return (
    <>
      {/* Section 6: Team Performance Table */}
      <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm mb-6">
        <h2 className="text-[18px] font-semibold text-[#111827] mb-4">Team Performance Details</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-[#F2761B] text-white">
                <th className="text-left p-3 text-[13px] font-semibold">Member</th>
                <th className="text-left p-3 text-[13px] font-semibold">Role</th>
                <th className="text-left p-3 text-[13px] font-semibold">Assigned</th>
                <th className="text-left p-3 text-[13px] font-semibold">Completed</th>
                <th className="text-left p-3 text-[13px] font-semibold">Pending</th>
                <th className="text-left p-3 text-[13px] font-semibold">Contribution</th>
                <th className="text-left p-3 text-[13px] font-semibold">Productivity</th>
              </tr>
            </thead>
            <tbody>
              {analytics.team.contributions.map((member, idx) => (
                <tr key={member.userId} className={`border-b border-[#e6e8ec] ${idx % 2 ? 'bg-[#fafafa]' : 'bg-white'}`}>
                  <td className="p-3 text-[13px] text-[#111827]">{member.name}</td>
                  <td className="p-3 text-[13px] text-[#717182]">{member.role}</td>
                  <td className="p-3 text-[13px] text-[#111827]">{member.tasksAssigned}</td>
                  <td className="p-3 text-[13px] text-[#111827]">{member.tasksCompleted}</td>
                  <td className="p-3 text-[13px] text-[#111827]">{member.tasksPending}</td>
                  <td className="p-3 text-[13px] font-semibold text-[#F2761B]">{member.contributionPercentage}%</td>
                  <td className="p-3 text-[13px] font-semibold text-[#111827]">{member.productivityScore}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 7: Trends Analysis */}
      <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm mb-6">
        <h2 className="text-[18px] font-semibold text-[#111827] mb-4">Trends Over Time</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.trends.completion.map((c, i) => ({
              date: c.date,
              Completion: c.value,
              Quality: analytics.trends.quality[i]?.value || 0,
              Risk: analytics.trends.riskScore[i]?.value || 0
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Completion" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="Quality" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="Risk" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section 8: Milestones */}
      <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm mb-6">
        <h2 className="text-[18px] font-semibold text-[#111827] mb-4">Project Milestones</h2>
        <div className="space-y-4">
          {analytics.milestones.map((milestone, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                milestone.status === 'completed' ? 'bg-green-100 text-green-600' :
                milestone.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                {milestone.status === 'completed' ? '✓' : milestone.status === 'in-progress' ? '⋯' : '○'}
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#111827]">{milestone.name}</p>
                <p className="text-[12px] text-[#717182]">
                  {milestone.planned && `Planned: ${new Date(milestone.planned).toLocaleDateString()}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[14px] font-semibold text-[#111827]">{milestone.progress}%</p>
                <p className={`text-[11px] px-2 py-1 rounded ${
                  milestone.status === 'completed' ? 'bg-green-100 text-green-700' :
                  milestone.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {milestone.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 9: Issues & Blockers */}
      {analytics.issues.length > 0 && (
        <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm mb-6">
          <h2 className="text-[18px] font-semibold text-[#111827] mb-4">Issues & Blockers</h2>
          <div className="space-y-3">
            {analytics.issues.map((issue, idx) => (
              <div key={idx} className={`p-4 rounded-[8px] border-2 ${
                issue.severity === 'HIGH' ? 'bg-red-50 border-red-200' :
                issue.severity === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-[11px] font-semibold ${
                      issue.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                      issue.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {issue.severity}
                    </span>
                    <span className="text-[13px] font-semibold text-[#111827]">{issue.type}</span>
                  </div>
                </div>
                <p className="text-[13px] text-[#111827] mb-2">{issue.description}</p>
                <p className="text-[12px] text-[#717182] mb-1">Impact: {issue.impact}</p>
                <p className="text-[12px] text-[#717182]">Action: {issue.action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 10: Comparison */}
      <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm mb-6">
        <h2 className="text-[18px] font-semibold text-[#111827] mb-4">Comparative Analytics</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 text-[13px] font-semibold">Metric</th>
                <th className="text-left p-3 text-[13px] font-semibold">This Project</th>
                <th className="text-left p-3 text-[13px] font-semibold">Team Average</th>
                <th className="text-left p-3 text-[13px] font-semibold">Variance</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#e6e8ec]">
                <td className="p-3 text-[13px] font-medium">Completion</td>
                <td className="p-3 text-[13px]">{analytics.comparison.thisProject.completion.toFixed(1)}%</td>
                <td className="p-3 text-[13px]">{analytics.comparison.teamAverage.completion}%</td>
                <td className={`p-3 text-[13px] font-semibold ${analytics.comparison.variance.completion >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.comparison.variance.completion >= 0 ? '+' : ''}{analytics.comparison.variance.completion.toFixed(1)}%
                </td>
              </tr>
              <tr className="border-b border-[#e6e8ec] bg-[#fafafa]">
                <td className="p-3 text-[13px] font-medium">Quality Score</td>
                <td className="p-3 text-[13px]">{analytics.comparison.thisProject.quality}/100</td>
                <td className="p-3 text-[13px]">{analytics.comparison.teamAverage.quality}/100</td>
                <td className={`p-3 text-[13px] font-semibold ${analytics.comparison.variance.quality >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.comparison.variance.quality >= 0 ? '+' : ''}{analytics.comparison.variance.quality}
                </td>
              </tr>
              <tr className="border-b border-[#e6e8ec]">
                <td className="p-3 text-[13px] font-medium">SPI</td>
                <td className="p-3 text-[13px]">{analytics.comparison.thisProject.spi.toFixed(1)}%</td>
                <td className="p-3 text-[13px]">{analytics.comparison.teamAverage.spi}%</td>
                <td className={`p-3 text-[13px] font-semibold ${analytics.comparison.variance.spi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.comparison.variance.spi >= 0 ? '+' : ''}{analytics.comparison.variance.spi.toFixed(1)}%
                </td>
              </tr>
              <tr className="bg-[#fafafa]">
                <td className="p-3 text-[13px] font-medium">Velocity</td>
                <td className="p-3 text-[13px]">{analytics.comparison.thisProject.velocity.toFixed(2)}</td>
                <td className="p-3 text-[13px]">{analytics.comparison.teamAverage.velocity}</td>
                <td className={`p-3 text-[13px] font-semibold ${analytics.comparison.variance.velocity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.comparison.variance.velocity >= 0 ? '+' : ''}{analytics.comparison.variance.velocity.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-3 bg-gray-50 rounded-[8px]">
          <p className="text-[13px] text-[#717182]">
            Performance Summary: <span className="font-semibold text-[#111827]">
              {analytics.comparison.betterWorse.better} metrics better, {analytics.comparison.betterWorse.worse} metrics worse than team average
            </span>
          </p>
        </div>
      </div>
    </>
  );
}
