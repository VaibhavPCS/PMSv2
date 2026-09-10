'use client';

// Dashboard page (Next.js App Router port of the old
// app/routes/dashboard/dashboard.tsx). Thin composer: all state/data lives in
// useDashboardData; all markup lives in the sibling presentational components.
// UI is pixel-identical to the old screen.

import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { DashboardStatsCards } from '@/components/dashboard/DashboardStatsCards';
import { ProjectStatisticsChart } from '@/components/dashboard/ProjectStatisticsChart';
import { RecentProjectsTable } from '@/components/dashboard/RecentProjectsTable';
import { TaskOverviewPanel } from '@/components/dashboard/TaskOverviewPanel';
import { ApprovalTasksTable } from '@/components/dashboard/ApprovalTasksTable';
import { TaskUpdateDeleteDialogs } from '@/components/dashboard/TaskUpdateDeleteDialogs';
import { RejectTaskDialog } from '@/components/dashboard/RejectTaskDialog';
import { useEffect } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const d = useDashboardData();

  // ==================== RENDER GUARDS ====================

  useEffect(() => {
    if (!d.isLoading && !d.isAuthenticated) {
      router.push('/login');
    }
  }, [d.isLoading, d.isAuthenticated, router]);

  if (d.isLoading || d.loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!d.isAuthenticated) {
    return null;
  }

  const navigateToTask = (taskId: string) => router.push(`/tasks/${taskId}`);

  // ==================== RENDER ====================

  return (
    <>
      {/* CSS Keyframe Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      <div className="min-h-screen bg-[#F9F9F9] p-3 sm:p-4 md:p-6">
        <div className="max-w-full mx-auto space-y-4 md:space-y-6">
          {/* Page Title */}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
          </div>

          {/* TOP ROW: Statistics Cards + Project Chart Side by Side */}
          {(d.isAdmin || (d.accessibleProjectIds && d.accessibleProjectIds.size > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Project Statistics Cards */}
              <DashboardStatsCards
                projectStats={d.projectStats}
                approvalStats={d.approvalStats}
              />

              {/* Right: Project Statistics Pie Chart */}
              <ProjectStatisticsChart
                monthlyProjectStats={d.monthlyProjectStats}
                selectedMonth={d.selectedMonth}
                selectedYear={d.selectedYear}
                setSelectedYear={d.setSelectedYear}
                showMonthPicker={d.showMonthPicker}
                setShowMonthPicker={d.setShowMonthPicker}
                handleMonthChange={d.handleMonthChange}
              />
            </div>
          )}

          {/* BOTTOM ROW: Recent Projects Table + Task Overview Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Recent Ongoing Projects Table (2/3 width) */}
            <RecentProjectsTable
              recentProjects={d.recentProjects}
              filteredProjects={d.filteredProjects}
              currentWorkspace={d.currentWorkspace}
              workspaces={d.workspaces}
              projectSearchQuery={d.projectSearchQuery}
              setProjectSearchQuery={d.setProjectSearchQuery}
              handleSwitchWorkspace={d.handleSwitchWorkspace}
              handleViewProject={d.handleViewProject}
              projectsTableRef={d.projectsTableRef}
              syncedHeight={d.syncedHeight}
            />

            {/* Right: Task Overview Panel (1/3 width) - Shows last on mobile */}
            <TaskOverviewPanel
              filteredTasks={d.filteredTasks}
              taskSearchQuery={d.taskSearchQuery}
              setTaskSearchQuery={d.setTaskSearchQuery}
              taskStatusFilter={d.taskStatusFilter}
              setTaskStatusFilter={d.setTaskStatusFilter}
              user={d.user}
              taskMonth={d.taskMonth}
              setTaskMonth={d.setTaskMonth}
              taskYear={d.taskYear}
              setTaskYear={d.setTaskYear}
              showTaskMonthPicker={d.showTaskMonthPicker}
              setShowTaskMonthPicker={d.setShowTaskMonthPicker}
              taskOverviewRef={d.taskOverviewRef}
              syncedHeight={d.syncedHeight}
              navigateToTask={navigateToTask}
              handleOpenUpdateModal={d.handleOpenUpdateModal}
              handleOpenDeleteDialog={d.handleOpenDeleteDialog}
            />
          </div>

          {/* Approval Tasks Table - Only for TL/Lead/Admin/Owner */}
          {d.canSeeApprovalTable && (
            <ApprovalTasksTable
              approvalTasks={d.approvalTasks}
              approvalTasksLoading={d.approvalTasksLoading}
              approvingTaskId={d.approvingTaskId}
              rejectingTaskId={d.rejectingTaskId}
              navigateToTask={navigateToTask}
              handleApproveTask={d.handleApproveTask}
              openRejectModal={d.openRejectModal}
            />
          )}
        </div>
      </div>

      {/* Update + Delete Task Modals */}
      <TaskUpdateDeleteDialogs
        showUpdateModal={d.showUpdateModal}
        setShowUpdateModal={d.setShowUpdateModal}
        showDeleteDialog={d.showDeleteDialog}
        setShowDeleteDialog={d.setShowDeleteDialog}
        selectedTask={d.selectedTask}
        currentWorkspace={d.currentWorkspace}
        updateForm={d.updateForm}
        setUpdateForm={d.setUpdateForm}
        isUpdating={d.isUpdating}
        isDeleting={d.isDeleting}
        handleUpdateTask={d.handleUpdateTask}
        handleDeleteTask={d.handleDeleteTask}
      />

      {/* Reject Task Dialog */}
      <RejectTaskDialog
        showRejectDialog={d.showRejectDialog}
        setShowRejectDialog={d.setShowRejectDialog}
        rejectionReason={d.rejectionReason}
        setRejectionReason={d.setRejectionReason}
        rejectionFiles={d.rejectionFiles}
        setRejectionFiles={d.setRejectionFiles}
        rejectionLink={d.rejectionLink}
        setRejectionLink={d.setRejectionLink}
        rejectDueDate={d.rejectDueDate}
        setRejectDueDate={d.setRejectDueDate}
        rejectReassigneeId={d.rejectReassigneeId}
        setRejectReassigneeId={d.setRejectReassigneeId}
        isRejecting={d.isRejecting}
        taskToReject={d.taskToReject}
        handleRejectTask={d.handleRejectTask}
      />
    </>
  );
}
