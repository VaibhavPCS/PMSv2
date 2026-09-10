'use client';

// Main Report Screen view (project analytics report for admins/leads).
// Next.js App Router port of OLD report-screen.tsx. Header + filters JSX copied
// VERBATIM; heavy sections delegated to ReportCharts / MemberAccordion /
// HandoverModal; logic lives in use-report-screen.ts.
// Caller: app/(dashboard)/administration/project-management/report-screen/page.tsx.

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useReportScreen } from './use-report-screen';
import { ReportCharts } from './ReportCharts';
import { MemberAccordion } from './MemberAccordion';
import { HandoverModal } from './HandoverModal';

export function ReportScreenView() {
  const {
    workspaces, selectedWorkspace,
    projects, selectedProject, setSelectedProject,
    members, selectedMember, setSelectedMember,
    startDate, setStartDate, endDate, setEndDate,
    reportData, loading, initializing,
    selectedTaskForHandover, setSelectedTaskForHandover,
    isHandoverModalOpen, setIsHandoverModalOpen,
    expandedMembers, toggleMember,
    priorityCounts, avgCompletionTime, velocityData, teamPerformanceData,
    statusChartData, memberChartData,
    handleWorkspaceChange,
  } = useReportScreen();

  if (initializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-8 bg-slate-50/50 min-h-screen">

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Project Analytics</h1>
        <p className="text-slate-500 text-sm md:text-base">
          Comprehensive report for admins and leads. Select a workspace and project to begin.
        </p>
      </div>

      {/* Filters Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            {/* <Filter className="h-5 w-5 text-primary" /> */}
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Workspace Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Workspace</label>
              <Select value={selectedWorkspace} onValueChange={handleWorkspaceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws._id} value={ws._id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Project</label>
              <Select
                value={selectedProject}
                onValueChange={setSelectedProject}
                disabled={!selectedWorkspace || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium text-slate-700">Date Range</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <DatePicker
                  date={startDate}
                  onSelect={setStartDate}
                  placeholder="Start Date"
                  className="w-full"
                />
                <DatePicker
                  date={endDate}
                  onSelect={setEndDate}
                  placeholder="End Date"
                  className="w-full"
                />
              </div>
            </div>

          </div>

          {/* Member Filter - Full Width Below */}
          {(selectedWorkspace && selectedProject) && (
            <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-sm font-medium text-slate-700 block mb-2">Assigned Member (Optional)</label>
              <Select
                value={selectedMember}
                onValueChange={setSelectedMember}
              >
                <SelectTrigger className="w-full md:w-1/2 lg:w-1/3">
                  <SelectValue placeholder="All Members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Report Content */}
      {!loading && reportData && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

          <ReportCharts
            reportData={reportData}
            avgCompletionTime={avgCompletionTime}
            priorityCounts={priorityCounts}
            velocityData={velocityData}
            teamPerformanceData={teamPerformanceData}
            statusChartData={statusChartData}
            memberChartData={memberChartData}
          />

          {/* Member Details & Task Table (Grouped) */}
          <MemberAccordion
            members={members}
            selectedMember={selectedMember}
            reportData={reportData}
            expandedMembers={expandedMembers}
            toggleMember={toggleMember}
            onOpenHandover={(task) => {
              setSelectedTaskForHandover(task);
              setIsHandoverModalOpen(true);
            }}
          />
        </div>
      )}

      {/* Handover Modal */}
      <HandoverModal
        open={isHandoverModalOpen}
        onOpenChange={setIsHandoverModalOpen}
        task={selectedTaskForHandover}
      />

    </div>
  );
}
