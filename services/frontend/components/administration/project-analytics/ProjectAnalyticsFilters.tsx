'use client';

// Filter panel (workspace/project/date + actions) for Project Analytics.
// JSX copied VERBATIM from OLD project-analytics.tsx. Caller: ProjectAnalyticsView.tsx.

import type { Workspace, Project, AnalyticsData } from './types';

interface ProjectAnalyticsFiltersProps {
  workspaces: Workspace[];
  workspaceId: string;
  setWorkspaceId: (id: string) => void;
  projects: Project[];
  projectId: string;
  setProjectId: (id: string) => void;
  startDate: string;
  setStartDate: (s: string) => void;
  endDate: string;
  setEndDate: (s: string) => void;
  loading: boolean;
  error: string;
  analytics: AnalyticsData | null;
  generateAnalytics: () => void;
  downloadCSV: () => void;
}

export function ProjectAnalyticsFilters({
  workspaces,
  workspaceId,
  setWorkspaceId,
  projects,
  projectId,
  setProjectId,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  loading,
  error,
  analytics,
  generateAnalytics,
  downloadCSV,
}: ProjectAnalyticsFiltersProps) {
  return (
    <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm mb-6">
      <h2 className="text-[16px] font-semibold text-[#111827] mb-4">Select Project & Date Range</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-[13px] font-medium text-[#111827] mb-2">Workspace</label>
          <select
            className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-[14px] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none"
            value={workspaceId}
            onChange={e => {
              setWorkspaceId(e.target.value)
              localStorage.setItem('currentWorkspaceId', e.target.value)
            }}
          >
            {workspaces.map(w => (<option key={w._id} value={w._id}>{w.name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#111827] mb-2">Project</label>
          <select
            className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-[14px] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none"
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            disabled={!workspaceId}
          >
            {projects.map(p => (<option key={p._id} value={p._id}>{p.title}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#111827] mb-2">Start Date</label>
          <input
            type="date"
            className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-[14px] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#111827] mb-2">End Date</label>
          <input
            type="date"
            className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-[14px] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-3 pt-4 mt-4 border-t border-[#e6e8ec]">
        <button
          onClick={generateAnalytics}
          disabled={!projectId || !startDate || !endDate || loading}
          className="bg-[#F2761B] hover:bg-[#F2761B]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-[18px] py-[11px] rounded-[8px] text-[14px] font-medium flex items-center gap-2"
        >
          {loading ? 'Generating...' : 'Generate Analytics'}
        </button>
        {analytics && (
          <button
            onClick={downloadCSV}
            className="bg-gray-600 hover:bg-gray-700 text-white px-[18px] py-[11px] rounded-[8px] text-[14px] font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download CSV
          </button>
        )}
        {error && <span className="text-[13px] text-red-600 flex items-center">{error}</span>}
      </div>
    </div>
  );
}
