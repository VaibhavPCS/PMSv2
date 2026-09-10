'use client';

// "Task Overview" panel (1/3 width) with search, status tabs + task cards.
// Markup copied verbatim from the old dashboard.tsx.

import { RefObject } from "react";
import { Search, MoreVertical, Pencil, Trash2, Calendar, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatMonthYear } from "@/components/dashboard/dashboard-helpers";
import type { Task } from "@/components/dashboard/dashboard-helpers";

interface TaskOverviewPanelProps {
  filteredTasks: Task[];
  taskSearchQuery: string;
  setTaskSearchQuery: (value: string) => void;
  taskStatusFilter: string;
  setTaskStatusFilter: (value: string) => void;
  user: any;
  taskMonth: number | null;
  setTaskMonth: (month: number | null) => void;
  taskYear: number;
  setTaskYear: (year: number) => void;
  showTaskMonthPicker: boolean;
  setShowTaskMonthPicker: (open: boolean) => void;
  taskOverviewRef: RefObject<HTMLDivElement | null>;
  syncedHeight: number | null;
  navigateToTask: (taskId: string) => void;
  handleOpenUpdateModal: (task: Task) => void;
  handleOpenDeleteDialog: (task: Task) => void;
}

export function TaskOverviewPanel({
  filteredTasks,
  taskSearchQuery,
  setTaskSearchQuery,
  taskStatusFilter,
  setTaskStatusFilter,
  user,
  taskMonth,
  setTaskMonth,
  taskYear,
  setTaskYear,
  showTaskMonthPicker,
  setShowTaskMonthPicker,
  taskOverviewRef,
  syncedHeight,
  navigateToTask,
  handleOpenUpdateModal,
  handleOpenDeleteDialog,
}: TaskOverviewPanelProps) {
  return (
    <div className="lg:col-span-1 order-4 md:order-none">
      <Card className="overflow-hidden px-2 sm:px-[10px] py-[15px]">
        <div className="px-[10px]">
          {/* Header */}
          <div className="flex items-center justify-between gap-[10px] mb-[15px]">
            <h3 className="font-['Inter'] font-medium text-[16px] text-[#2e2e30] leading-normal flex-1">
              Task Overview
            </h3>
            {/* Month/Year filter (by task due date) — mirrors Project Statistics */}
            <DropdownMenu open={showTaskMonthPicker} onOpenChange={setShowTaskMonthPicker}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-[25px] rounded-[6px] bg-[#f5f4f9] text-[#777777] text-[12px] font-['Inter'] hover:bg-[#e5e4e9] px-[8px] flex items-center gap-2 shrink-0"
                >
                  <Calendar className="w-4 h-4" />
                  {taskMonth === null ? "All Dates" : formatMonthYear(taskMonth, taskYear)}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[280px] p-4">
                <div className="space-y-4">
                  {/* Year selector */}
                  <div className="flex items-center justify-between gap-2">
                    <Button variant="outline" size="sm" onClick={() => setTaskYear(taskYear - 1)} className="h-8 px-2">←</Button>
                    <span className="text-sm font-semibold">{taskYear}</span>
                    <Button variant="outline" size="sm" onClick={() => setTaskYear(taskYear + 1)} className="h-8 px-2">→</Button>
                  </div>
                  {/* Month grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className={cn("h-8 text-xs", taskMonth === i && "bg-blue-100 border-blue-500")}
                        onClick={() => { setTaskMonth(i); setShowTaskMonthPicker(false); }}
                      >
                        {m}
                      </Button>
                    ))}
                  </div>
                  {/* Clear */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => { setTaskMonth(null); setShowTaskMonthPicker(false); }}
                  >
                    All Dates
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search and Filter */}
          <div className="space-y-[10px] mb-[15px]">
            <div className="relative bg-[#f5f4f9] rounded-[8px] h-[37px] px-[10px] flex items-center justify-between">
              <div className="flex items-center gap-[10px]">
                <Search className="w-[15px] h-[15px] text-[#040110] opacity-60" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-[14px] font-['Inter'] text-[#040110] opacity-60 placeholder:text-[#040110] placeholder:opacity-60"
                />
              </div>
            </div>

            <div className="flex items-center gap-[10px] overflow-x-auto scrollbar-visible">
              <button
                onClick={() => setTaskStatusFilter("all")}
                className={cn(
                  "px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap",
                  taskStatusFilter === "all"
                    ? "border-b-[1px] border-[#f2761b] opacity-100"
                    : "opacity-60"
                )}
              >
                All
              </button>
              <button
                onClick={() => setTaskStatusFilter("to-do")}
                className={cn(
                  "px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap",
                  taskStatusFilter === "to-do"
                    ? "border-b-[1px] border-[#f2761b] opacity-100"
                    : "opacity-60"
                )}
              >
                To Do
              </button>
              <button
                onClick={() => setTaskStatusFilter("in-progress")}
                className={cn(
                  "px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap",
                  taskStatusFilter === "in-progress"
                    ? "border-b-[1px] border-[#f2761b] opacity-100"
                    : "opacity-60"
                )}
              >
                In Progress
              </button>
              <button
                onClick={() => setTaskStatusFilter("on-hold")}
                className={cn(
                  "px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap",
                  taskStatusFilter === "on-hold"
                    ? "border-b-[1px] border-[#f2761b] opacity-100"
                    : "opacity-60"
                )}
              >
                On Hold
              </button>
              <button
                onClick={() => setTaskStatusFilter("done")}
                className={cn(
                  "px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap",
                  taskStatusFilter === "done"
                    ? "border-b-[1px] border-[#f2761b] opacity-100"
                    : "opacity-60"
                )}
              >
                Done
              </button>
            </div>
          </div>

          {/* Task List */}
          <div ref={taskOverviewRef}>
            <ScrollArea
              className="scrollbar-visible"
              style={{
                height: syncedHeight ? `${syncedHeight}px` : '600px'
              }}
            >
              <div className="space-y-[10px]">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-[#717182] text-[14px] font-['Inter']">
                  {taskSearchQuery ? "No tasks match your search" : "No tasks found"}
                </div>
              ) : (
                filteredTasks.map((task) => {
                  return (
                    <div
                      key={task._id}
                      onClick={() => navigateToTask(task._id)}
                      className={cn(
                        "rounded-lg border border-gray-200 bg-white px-[10px] py-4 transition-all duration-200 hover:shadow-md hover:border-gray-300 cursor-pointer w-full",
                        "flex gap-3 items-start min-h-fit"
                      )}
                    >
                      {/* Status indicator */}
                      <div
                        className={cn(
                          "w-1 min-h-[40px] rounded-full shrink-0 mt-1 self-stretch",
                          task.status === "to-do" && "bg-blue-500",
                          task.status === "in-progress" && "bg-amber-500",
                          task.status === "done" && "bg-green-500",
                          task.status === "on-hold" && "bg-[#CD2812]"
                        )}
                      />

                      {/* Task content */}
                      <div className="flex-1 min-w-0">
                        {/* Task title — wrapped to parent width, capped at 70 chars */}
                        <h4
                          className="font-medium text-gray-900 text-sm leading-5 mb-2 break-words whitespace-normal"
                          title={task.title}
                        >
                          {task.title.length > 70 ? `${task.title.slice(0, 70)}...` : task.title}
                        </h4>

                        {/* Task metadata */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {/* Assignee */}
                          {task.assignedTo && (
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
                                {task.assignedTo.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-gray-700 text-xs font-medium truncate">
                                {task.assignedTo.name.split(' ')[0].charAt(0).toUpperCase() + task.assignedTo.name.split(' ')[0].slice(1).toLowerCase()}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Status badge */}
                            <div className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              task.status === "to-do" && "bg-blue-100 text-blue-700",
                              task.status === "in-progress" && "bg-amber-100 text-amber-700",
                              task.status === "done" && "bg-green-100 text-green-700",
                              task.status === "on-hold" && "bg-red-100 text-red-700"
                            )}>
                              {task.status === "to-do" ? "To Do" :
                                task.status === "in-progress" ? "In Progress" :
                                task.status === "on-hold" ? "On Hold" : "Done"}
                            </div>

                            {/* 3-dot menu - Admin only */}
                            {(user?.role === 'admin' || user?.role === 'super_admin') && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 hover:bg-gray-100"
                                  >
                                    <MoreVertical className="h-4 w-4 text-gray-600" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenUpdateModal(task);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Update
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenDeleteDialog(task);
                                    }}
                                    className="cursor-pointer text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
          </div>
        </div>
      </Card>
    </div>
  );
}
