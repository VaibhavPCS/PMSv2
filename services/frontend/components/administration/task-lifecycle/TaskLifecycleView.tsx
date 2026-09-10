'use client';

// Task Lifecycle dashboard view (Next.js App Router port of OLD
// app/routes/administration/project-management/task-lifecycle.tsx).
// Markup (header, filters, timeline chart, event table) copied VERBATIM;
// data/actions live in use-task-lifecycle.ts.
// Caller: app/(dashboard)/administration/project-management/task-lifecycle/page.tsx.

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useTaskLifecycle } from './use-task-lifecycle';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white border border-[#e6e8ec] rounded-lg shadow-lg p-3">
        <p className="text-[13px] font-semibold mb-1 text-[#111827]">{data.date}</p>
        <p className="text-[12px] text-[#717182] mb-2">Time: {data.time}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            entry.value > 0 && (
              <p key={index} className="text-[12px] font-medium" style={{ color: entry.color }}>
                {entry.name}: {entry.value}
              </p>
            )
          ))}
        </div>
      </div>
    )
  }
  return null
}

export function TaskLifecycleView() {
  const {
    workspaceId, setWorkspaceId,
    workspaces,
    projects, projectId, setProjectId,
    tasks, taskId, setTaskId,
    timeline, loading,
    canDownload, downloadCsv,
  } = useTaskLifecycle();

  const chartData = [...timeline]
    .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((e: any) => {
      const dateObj = new Date(e.timestamp)
      const isOnHold = e.eventType === 'status_changed' && e.changes?.newValue === 'on-hold'
      const isInProgress = e.eventType === 'started' || (e.eventType === 'status_changed' && e.changes?.newValue === 'in-progress')
      return {
        date: dateObj.toLocaleDateString(),
        time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        fullTimestamp: dateObj.toLocaleString(),
        Approved: e.eventType === 'approved' ? 1 : 0,
        Completed: e.eventType === 'completed' ? 1 : 0,
        Assigned: e.eventType === 'assigned' ? 1 : 0,
        Created: e.eventType === 'created' ? 1 : 0,
        Reassigned: e.eventType === 'reassigned' ? 1 : 0,
        OnHold: isOnHold ? 1 : 0,
        InProgress: isInProgress ? 1 : 0,
      }
    })

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-content, #printable-content * {
            visibility: visible;
          }
          #printable-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-break {
            page-break-before: always;
          }
          .bg-gray-50 {
            background-color: white !important;
          }
        }
      `}</style>
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 no-print">
            <h1 className="text-[22px] md:text-[24px] font-bold text-[#111827] mb-1">Task Lifecycle</h1>
            <p className="text-[#717182] text-[13px]">Track task events and timeline with detailed metrics</p>
          </div>

          {/* Filter Section */}
          <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm mb-6 no-print">
            <h2 className="text-[16px] font-semibold text-[#111827] mb-4">Select Task</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-2">Workspace</label>
                <select
                  className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-[14px] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none transition-colors"
                  value={workspaceId}
                  onChange={e => {
                    const v = e.target.value
                    setWorkspaceId(v)
                    localStorage.setItem('currentWorkspaceId', v)
                    setProjectId('')
                    setTaskId('')
                  }}
                >
                  {workspaces.map(w => (<option key={w._id} value={w._id}>{w.name || w._id}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-2">Project</label>
                <select
                  className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-[14px] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  disabled={!workspaceId}
                >
                  {projects.map(p => (<option key={p._id} value={p._id}>{p.title}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-2">Task</label>
                <select
                  className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-[14px] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                  value={taskId}
                  onChange={e => setTaskId(e.target.value)}
                  disabled={!projectId || tasks.length === 0}
                >
                  {tasks.map(t => (<option key={t._id} value={t._id}>{t.title}</option>))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4 mt-4 border-t border-[#e6e8ec]">
              <button
                onClick={downloadCsv}
                disabled={!canDownload || loading}
                className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 bg-[#F2761B] hover:bg-[#F2761B]/90 text-white px-[18px] py-[11px] h-auto rounded-[8px] text-[14px] font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download CSV
              </button>
              {/* <button
                onClick={() => window.print()}
                disabled={!taskId}
                className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 bg-gray-600 hover:bg-gray-700 text-white px-[18px] py-[11px] h-auto rounded-[8px] text-[14px] font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button> */}
              {loading && <span className="text-[13px] text-[#717182] flex items-center">Loading timeline...</span>}
            </div>
          </div>

          <div id="printable-content">
          {/* Timeline Chart Section */}
          <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm mb-6">
              <div className="mb-4">
                <h2 className="text-[18px] font-semibold text-[#111827] mb-1">Task Timeline Chart</h2>
                <p className="text-[13px] text-[#717182]">Visual representation of task events over time</p>
              </div>

              {/* Mobile Message - Hidden on md and up */}
              <div className="md:hidden">
                <div className="bg-blue-50 border border-blue-200 rounded-[8px] p-6 text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-[15px] font-semibold text-blue-900 mb-1">Desktop View Required</p>
                  <p className="text-[13px] text-blue-700">For the Graph, open on desktop or tablet</p>
                </div>
              </div>

              {/* Chart - Shown only on md and up */}
              <div className="hidden md:block">
                <div className="h-80 bg-gray-50 rounded-[8px] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e6e8ec" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        stroke="#717182"
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="#717182"
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="Created" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Assigned" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="InProgress" stroke="#14b8a6" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Approved" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Reassigned" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="OnHold" stroke="#9333ea" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend Description */}
                {/* <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div>
                    <span className="text-[12px] text-[#717182]">Created</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
                    <span class="text-[12px] text-[#717182]">Assigned</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#14b8a6]"></div>
                    <span className="text-[12px] text-[#717182]">In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                    <span className="text-[12px] text-[#717182]">Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#6366f1]"></div>
                    <span className="text-[12px] text-[#717182]">Approved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                    <span className="text-[12px] text-[#717182]">Reassigned</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#9333ea]"></div>
                    <span className="text-[12px] text-[#717182]">On Hold</span>
                  </div>
                </div> */}
              </div>
            </div>

            {/* Timeline Table Section */}
            <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-[18px] font-semibold text-[#111827] mb-1">Event Timeline</h2>
                <p className="text-[13px] text-[#717182]">Detailed history of all task events and changes</p>
              </div>

              {timeline.length === 0 ? (
                <div className="text-center py-12 text-[#717182]">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-[14px]">Select a task to view its timeline</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-[#F2761B] text-white">
                          <th className="text-left p-3 text-[13px] font-semibold whitespace-nowrap">Timestamp</th>
                          <th className="text-left p-3 text-[13px] font-semibold whitespace-nowrap">Event</th>
                          <th className="text-left p-3 text-[13px] font-semibold whitespace-nowrap">Actor</th>
                          <th className="text-left p-3 text-[13px] font-semibold whitespace-nowrap">Status</th>
                          <th className="text-left p-3 text-[13px] font-semibold whitespace-nowrap">Field</th>
                          <th className="text-left p-3 text-[13px] font-semibold whitespace-nowrap">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const sorted = [...timeline].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                          const isId = (v: any) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v)
                          const fmt = (v: any) => {
                            if (v === null || v === undefined || v === '') return '—'
                            return isId(v) ? '—' : String(v)
                          }
                          let currStatus = 'to-do'
                          return sorted.map((e: any, idx: number) => {
                            if (e.changes?.field === 'status') {
                              currStatus = String(e.changes?.newValue || currStatus)
                            } else if (e.eventType === 'completed') {
                              currStatus = 'done'
                            } else if (e.eventType === 'assigned' && !currStatus) {
                              currStatus = 'to-do'
                            }
                            return (
                              <tr key={idx} className={`border-b border-[#e6e8ec] hover:bg-gray-50 transition-colors ${idx % 2 ? 'bg-[#fafafa]' : 'bg-white'}`}>
                                <td className="p-3 text-[13px] text-[#111827] whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</td>
                                <td className="p-3 text-[13px] whitespace-nowrap">
                                  <span className={`px-2 py-1 rounded-[4px] text-[11px] font-medium ${e.eventType === 'completed' ? 'bg-green-100 text-green-700' :
                                      e.eventType === 'approved' ? 'bg-blue-100 text-blue-700' :
                                        e.eventType === 'created' ? 'bg-purple-100 text-purple-700' :
                                          e.eventType === 'reassigned' ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-700'
                                    }`}>
                                    {e.eventType}
                                  </span>
                                </td>
                                <td className="p-3 text-[13px] text-[#717182]">{e.actor?.name || '—'}</td>
                                <td className="p-3 text-[13px]">
                                  <span className={`px-2 py-1 rounded-[4px] text-[11px] font-medium ${currStatus === 'done' ? 'bg-green-100 text-green-700' :
                                      currStatus === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                        currStatus === 'on-hold' ? 'bg-red-100 text-red-700' :
                                          'bg-gray-100 text-gray-700'
                                    }`}>
                                    {currStatus}
                                  </span>
                                </td>
                                <td className="p-3 text-[13px] text-[#717182]">{e.changes?.field || '—'}</td>
                                <td className="p-3 text-[13px] text-[#717182]">
                                  {e.changes?.field ? (
                                    <span>
                                      <span className="text-red-600">{fmt(e.changes?.oldValue)}</span>
                                      {' → '}
                                      <span className="text-green-600">{fmt(e.changes?.newValue)}</span>
                                    </span>
                                  ) : '—'}
                                </td>
                              </tr>
                            )
                          })
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
