'use client';

// Project Analytics Dashboard view (Next.js App Router port of OLD
// project-analytics.tsx). Page shell + header copied VERBATIM; filters and the
// analytics sections delegated to ProjectAnalyticsFilters / Overview / Details;
// logic in use-project-analytics.ts.
// Caller: app/(dashboard)/administration/project-management/project-analytics/page.tsx.

import { useProjectAnalytics } from './use-project-analytics';
import { ProjectAnalyticsFilters } from './ProjectAnalyticsFilters';
import { ProjectAnalyticsOverview } from './ProjectAnalyticsOverview';
import { ProjectAnalyticsDetails } from './ProjectAnalyticsDetails';

export function ProjectAnalyticsView() {
  const {
    workspaceId, setWorkspaceId,
    workspaces, projects,
    projectId, setProjectId,
    startDate, setStartDate, endDate, setEndDate,
    analytics, loading, error,
    generateAnalytics, downloadCSV,
  } = useProjectAnalytics();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-[22px] md:text-[24px] font-bold text-[#111827] mb-1">Project Analytics Dashboard</h1>
            <p className="text-[#717182] text-[13px]">Comprehensive project insights with 20+ metrics and risk analysis</p>
          </div>

          {/* Filter Section */}
          <ProjectAnalyticsFilters
            workspaces={workspaces}
            workspaceId={workspaceId}
            setWorkspaceId={setWorkspaceId}
            projects={projects}
            projectId={projectId}
            setProjectId={setProjectId}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            loading={loading}
            error={error}
            analytics={analytics}
            generateAnalytics={generateAnalytics}
            downloadCSV={downloadCSV}
          />

          {analytics && (
            <>
              <ProjectAnalyticsOverview analytics={analytics} />
              <ProjectAnalyticsDetails analytics={analytics} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
