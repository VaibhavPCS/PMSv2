'use client';

// "Task Approval Management" table (TL/Lead/Admin/Owner only).
// Markup copied verbatim from the old dashboard.tsx.

import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateDDMMYYYY } from "@/lib/date-utils";
import type { Task } from "@/components/dashboard/dashboard-helpers";

interface ApprovalTasksTableProps {
  approvalTasks: Task[];
  approvalTasksLoading: boolean;
  approvingTaskId: string | null;
  rejectingTaskId: string | null;
  navigateToTask: (taskId: string) => void;
  handleApproveTask: (taskId: string) => void;
  openRejectModal: (task: Task) => void;
}

export function ApprovalTasksTable({
  approvalTasks,
  approvalTasksLoading,
  approvingTaskId,
  rejectingTaskId,
  navigateToTask,
  handleApproveTask,
  openRejectModal,
}: ApprovalTasksTableProps) {
  return (
    <div className="mt-6">
      <Card className="shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
        <CardHeader className="px-[20px] py-[15px]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-['Inter'] font-medium text-[18px] text-black leading-[22px]">
                Task Approval Management
              </h3>
              <p className="font-['Inter'] font-normal text-[12px] text-[#717182] leading-[12px] tracking-[0.5px] mt-2">
                Review and approve or reject task submissions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600">
                Pending: <span className="font-semibold text-orange-600">{approvalTasks.length}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-[20px] pb-[15px]">
          {approvalTasksLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
              <span className="text-gray-600">Loading approval tasks...</span>
            </div>
          ) : approvalTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg font-medium mb-2">No tasks pending approval</p>
              <p className="text-sm">All submitted tasks have been reviewed</p>
            </div>
          ) : (
            <div className="border border-[#cccccc] rounded-[10px] overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="bg-[#d5e5ff]">
                    <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-medium text-[rgba(0,0,0,0.8)]">
                      Task Title
                    </th>
                    <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-medium text-[rgba(0,0,0,0.8)]">
                      Project
                    </th>
                    <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-medium text-[rgba(0,0,0,0.8)]">
                      Assignee
                    </th>
                    <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-medium text-[rgba(0,0,0,0.8)]">
                      Submitted
                    </th>
                    <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-medium text-[rgba(0,0,0,0.8)]">
                      Priority
                    </th>
                    <th className="text-center px-[16px] py-[12px] text-[12px] font-['Inter'] font-medium text-[rgba(0,0,0,0.8)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {approvalTasks.map((task, index) => (
                    <tr
                      key={task._id}
                      onClick={() => navigateToTask(task._id)}
                      className={cn(
                        "transition-colors hover:bg-[#e6f2ff] cursor-pointer",
                        index % 2 === 1 ? "bg-[#f2f7ff]" : "bg-white"
                      )}
                    >
                      <td className="px-[16px] py-[14px] text-[12px] font-['Inter'] text-black">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{task.title}</span>
                          {task.description && (
                            <span className="text-[11px] text-gray-600 line-clamp-1">
                              {task.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-[16px] py-[14px] text-[12px] font-['Inter'] text-black">
                        {task.project?.title || "N/A"}
                      </td>
                      <td className="px-[16px] py-[14px] text-[12px] font-['Inter'] text-black">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
                            {task.assignedTo?.name?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <span>{task.assignedTo?.name || "Unassigned"}</span>
                        </div>
                      </td>
                      <td className="px-[16px] py-[14px] text-[12px] font-['Inter'] text-gray-600">
                        {(task as any).submittedForApprovalAt
                          ? formatDateDDMMYYYY((task as any).submittedForApprovalAt)
                          : "N/A"}
                      </td>
                      <td className="px-[16px] py-[14px]">
                        <Badge
                          className={cn(
                            "text-xs",
                            task.priority === "high" && "bg-red-100 text-red-700",
                            task.priority === "medium" && "bg-yellow-100 text-yellow-700",
                            task.priority === "low" && "bg-green-100 text-green-700"
                          )}
                        >
                          {task.priority || "N/A"}
                        </Badge>
                      </td>
                      <td className="px-[16px] py-[14px]">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveTask(task._id);
                            }}
                            disabled={!!approvingTaskId || !!rejectingTaskId}
                            className={cn(
                              "px-3 py-1 text-xs h-auto",
                              approvingTaskId === task._id
                                ? "bg-green-300 text-green-800 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700 text-white"
                            )}
                          >
                            {approvingTaskId === task._id ? "Approving..." : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              openRejectModal(task);
                            }}
                            disabled={!!approvingTaskId || !!rejectingTaskId}
                            className={cn(
                              "px-3 py-1 text-xs h-auto",
                              rejectingTaskId === task._id
                                ? "bg-red-300 text-red-800 cursor-not-allowed"
                                : ""
                            )}
                          >
                            {rejectingTaskId === task._id ? "Rejecting..." : "Reject"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
