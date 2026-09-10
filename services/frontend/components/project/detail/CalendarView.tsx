'use client';

import React, { useState, useCallback, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Task, FilterType, CurrentUser, Project } from "./types";

interface CalendarViewProps {
  tasks: Task[];
  filters: FilterType;
  updateFilter: (key: keyof FilterType, value: string) => void;
  clearFilters: () => void;
  isMobile: boolean;
  navigate: (path: string) => void;
  userRole: string;
  currentUser: CurrentUser | null;
  project: Project | null; // Added for member list access
}

// ── Hoisted pure helpers (no state/context deps) ──────────────────────────
const getTaskPositionType = (task: Task, date: Date): "single" | "start" | "middle" | "end" => {
  if (!task.startDate || !task.dueDate) return "single";
  const taskStart = new Date(task.startDate);
  const taskEnd = new Date(task.dueDate);
  const currentDay = new Date(date);
  taskStart.setHours(0, 0, 0, 0);
  taskEnd.setHours(0, 0, 0, 0);
  currentDay.setHours(0, 0, 0, 0);
  const isSameDay = taskStart.getTime() === taskEnd.getTime();
  const isStartDay = currentDay.getTime() === taskStart.getTime();
  const isEndDay = currentDay.getTime() === taskEnd.getTime();
  if (isSameDay) return "single";
  if (isStartDay) return "start";
  if (isEndDay) return "end";
  return "middle";
};

const getPriorityDotClass = (priority: string): string => {
  const colors: Record<string, string> = {
    urgent: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
  };
  return colors[priority] || "bg-gray-400";
};

const getTaskStatusColorClass = (status: string, positionType: string): string => {
  const baseColors: Record<string, string> = {
    "to-do": "bg-gray-100 text-gray-800",
    "in-progress": "bg-blue-100 text-blue-800",
    "on-hold": "bg-red-100 text-red-800",
    done: "bg-green-100 text-green-800",
  };
  const borderStyles: Record<string, string> = {
    single: "rounded-md border-l-4",
    start: "rounded-l-md border-l-4 rounded-r-none",
    middle: "rounded-none border-l-0 border-r-0",
    end: "rounded-r-md border-r-4 rounded-l-none",
  };
  const borderColors: Record<string, string> = {
    "to-do": "border-l-gray-500 border-r-gray-500",
    "in-progress": "border-l-blue-500 border-r-blue-500",
    "on-hold": "border-l-red-500 border-r-red-500",
    done: "border-l-green-500 border-r-green-500",
  };
  return `${baseColors[status] || baseColors["to-do"]} ${borderStyles[positionType]} ${borderColors[status] || borderColors["to-do"]}`;
};

const TaskItem = React.memo<{
  task: Task;
  date: Date;
  compact?: boolean;
  showTaskDetails: boolean;
  navigate: (path: string) => void;
}>(({ task, date, compact = false, showTaskDetails, navigate }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = new Date(task.dueDate) < today && task.status !== "done";
  const positionType = getTaskPositionType(task, date);
  const isStartDay = positionType === "start" || positionType === "single";

  return (
    <div
      className={cn(
        "p-1 text-xs cursor-pointer hover:shadow-sm transition-all mb-1 relative",
        getTaskStatusColorClass(task.status, positionType),
        isOverdue && "bg-red-100 text-red-800 border-l-red-500 border-r-red-500",
        compact && "py-0.5"
      )}
      onClick={() => navigate(`/task/${task._id}`)}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "font-medium truncate flex-1",
            task.status === "done" && "line-through opacity-60",
            positionType === "middle" && "text-transparent select-none"
          )}
        >
          {positionType === "middle" ? "•••" : task.title}
        </span>
        {isStartDay && (
          <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", getPriorityDotClass(task.priority))} />
        )}
      </div>

      {!compact && showTaskDetails && isStartDay && (
        <div className="mt-0.5 flex items-center justify-between text-xs opacity-80">
          <div className="flex items-center gap-1 min-w-0">
            <Avatar className="w-2.5 h-2.5">
              <AvatarFallback className="bg-current bg-opacity-20 text-current text-[8px] font-bold">
                {(task.assignee?.name?.charAt(0) || task.assignee?.email?.charAt(0) || "?")}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-[10px]">{(task.assignee?.name || task.assignee?.email || "?").split(" ")[0]}</span>
          </div>
          {task.durationDays && task.durationDays > 1 && (
            <span className="text-[9px] opacity-70">{task.durationDays}d</span>
          )}
        </div>
      )}

      {positionType !== "single" && (
        <div className="absolute top-0 right-0 text-[8px] opacity-60 leading-none">
          {positionType === "start" && "▶"}
          {positionType === "middle" && "─"}
          {positionType === "end" && "◀"}
        </div>
      )}
    </div>
  );
});
TaskItem.displayName = "TaskItem";

// ✅ UPDATED: Calendar View Component with Task Spans (Start to End)
export const CalendarViewComponent: React.FC<CalendarViewProps> = ({
  tasks,
  filters,
  updateFilter,
  clearFilters,
  isMobile,
  navigate,
  userRole,
  currentUser,
  project,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">("month");
  const [showTaskDetails, setShowTaskDetails] = useState(true);

  const navigateCalendar = useCallback(
    (direction: "prev" | "next") => {
      setCurrentDate((prevDate) => {
        const newDate = new Date(prevDate);
        if (calendarView === "month") {
          newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
        } else if (calendarView === "week") {
          newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
        } else {
          newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
        }
        return newDate;
      });
    },
    [calendarView]
  );

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const getCalendarTitle = useMemo(() => {
    const date = new Date(currentDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, [currentDate, calendarView]);

  // ✅ UPDATED: Get tasks that span across or fall on a specific date
  const getTasksForDate = useCallback(
    (date: Date) => {
      return tasks.filter((task) => {
        if (!task.startDate || !task.dueDate) return false;

        const taskStart = new Date(task.startDate);
        const taskEnd = new Date(task.dueDate);
        const currentDay = new Date(date);

        // Normalize dates to midnight for comparison
        taskStart.setHours(0, 0, 0, 0);
        taskEnd.setHours(0, 0, 0, 0);
        currentDay.setHours(0, 0, 0, 0);

        // Task spans or falls on this date if current date is between start and end (inclusive)
        return currentDay >= taskStart && currentDay <= taskEnd;
      });
    },
    [tasks]
  );

  const getCalendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days = [];

    // Previous month days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const date = new Date(year, month - 1, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: false,
        tasks: getTasksForDate(date),
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === new Date().toDateString();
      days.push({
        date,
        day,
        isCurrentMonth: true,
        isToday,
        tasks: getTasksForDate(date),
      });
    }

    // Next month days to complete the grid (6 weeks * 7 days = 42 days)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: false,
        tasks: getTasksForDate(date),
      });
    }

    return days;
  }, [currentDate, getTasksForDate]);

  const getWeekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push({
        date,
        day: date.getDate(),
        dayName: date.toLocaleDateString("en-GB", { weekday: "short" }),
        isToday,
        tasks: getTasksForDate(date),
      });
    }

    return days;
  }, [currentDate, getTasksForDate]);

  return (
    <div className="space-y-4">
      {/* Calendar Controls */}
      <Card>
        <CardContent className="p-4">
          {/* Calendar Navigation - Modern & Mobile-First */}
          <div className="space-y-3">
            {/* Navigation Row */}
            <div className="flex items-center justify-between">
              {/* Left: Navigation Controls with Date - Centered on Mobile */}
              <div className="flex items-center gap-2 flex-1 justify-center sm:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // On mobile, always navigate day-by-day regardless of view
                    if (isMobile) {
                      setCurrentDate((prevDate) => {
                        const newDate = new Date(prevDate);
                        newDate.setDate(newDate.getDate() - 1);
                        return newDate;
                      });
                    } else {
                      navigateCalendar("prev");
                    }
                  }}
                  className="h-9 w-9 p-0 rounded-lg flex-shrink-0 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {/* Dynamic Date Display - Mobile Only */}
                <div className="flex items-center gap-2">
                  <h2 className="sm:hidden text-base font-bold text-gray-900">
                    {getCalendarTitle}
                  </h2>
                  {/* Today button - Hidden on mobile */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                    className="hidden sm:inline-flex h-8 px-3 text-xs rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    Today
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // On mobile, always navigate day-by-day regardless of view
                    if (isMobile) {
                      setCurrentDate((prevDate) => {
                        const newDate = new Date(prevDate);
                        newDate.setDate(newDate.getDate() + 1);
                        return newDate;
                      });
                    } else {
                      navigateCalendar("next");
                    }
                  }}
                  className="h-9 w-9 p-0 rounded-lg flex-shrink-0 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Right: Eye toggle - Desktop only */}
              {!isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTaskDetails(!showTaskDetails)}
                  className="h-8 w-8 p-0 rounded-lg flex-shrink-0 hover:bg-blue-50"
                >
                  {showTaskDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              )}
            </div>

            {/* View Mode Buttons - Desktop Only */}
            {!isMobile && (
              <div className="flex items-center justify-center sm:justify-start">
                <div className="inline-flex bg-gray-100 rounded-lg p-1 gap-1">
                  {(["month", "week", "day"] as const).map((view) => (
                    <Button
                      key={view}
                      variant={calendarView === view ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCalendarView(view)}
                      className={cn(
                        "h-8 px-4 text-xs font-medium capitalize rounded-md transition-all",
                        calendarView === view
                          ? "bg-white shadow-sm text-gray-900 hover:bg-white"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      )}
                    >
                      {view}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ✅ UPDATED: Calendar Content - Day View on Mobile, Full Views on Desktop */}
      <Card>
        <CardContent className="p-0">
          {/* Mobile: Always show Day View */}
          {isMobile ? (
            <div className="p-4">
              <div className="max-w-2xl mx-auto">
                <Card
                  className={cn(
                    "text-center p-4 mb-4",
                    new Date().toDateString() === currentDate.toDateString() &&
                    "bg-blue-50 border-blue-200"
                  )}
                >
                  <h3 className="text-xl font-bold text-gray-900">
                    {(() => {
                      const date = new Date(currentDate);
                      const day = String(date.getDate()).padStart(2, '0');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    })()}
                  </h3>
                </Card>

                <div className="space-y-2">
                  {getTasksForDate(currentDate).length === 0 ? (
                    <Card className="border-dashed border-2 border-gray-200">
                      <CardContent className="text-center py-8">
                        <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-500">No tasks scheduled for this day</p>
                      </CardContent>
                    </Card>
                  ) : (
                    getTasksForDate(currentDate).map((task) => (
                      <TaskItem
                        key={`${task._id}-${currentDate.toDateString()}`}
                        task={task}
                        date={currentDate}
                        showTaskDetails={showTaskDetails}
                        navigate={navigate}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Desktop: Show selected view (month/week/day) */
            <>
              {calendarView === "month" && (
                <div className="p-4">
                  {/* Week headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {getCalendarDays.map((calendarDay, index) => (
                      <div
                        key={index}
                        className={cn(
                          "min-h-[100px] p-1 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors",
                          !calendarDay.isCurrentMonth && "bg-gray-50/50 text-gray-400",
                          calendarDay.isToday && "bg-blue-50 border-blue-200 ring-1 ring-blue-200"
                        )}
                      >
                        <div
                          className={cn(
                            "text-sm font-medium mb-1 px-1",
                            calendarDay.isToday && "text-blue-600 font-bold",
                            !calendarDay.isCurrentMonth && "text-gray-400"
                          )}
                        >
                          {calendarDay.day}
                        </div>
                        <div className="space-y-0.5 max-h-20 overflow-y-auto">
                          {calendarDay.tasks.slice(0, 4).map((task) => (
                            <TaskItem
                              key={`${task._id}-${calendarDay.date.toDateString()}`}
                              task={task}
                              date={calendarDay.date}
                              compact={true}
                              showTaskDetails={showTaskDetails}
                              navigate={navigate}
                            />
                          ))}
                          {calendarDay.tasks.length > 4 && (
                            <div className="text-xs text-gray-500 text-center bg-gray-100 rounded px-1 py-0.5">
                              +{calendarDay.tasks.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {calendarView === "week" && (
                <div className="p-4">
                  <div className="grid grid-cols-7 gap-4">
                    {getWeekDays.map((weekDay, index) => (
                      <div key={index} className="space-y-2">
                        <Card
                          className={cn(
                            "text-center p-3",
                            weekDay.isToday && "bg-blue-50 border-blue-200"
                          )}
                        >
                          <div className="text-xs font-medium text-gray-600">{weekDay.dayName}</div>
                          <div
                            className={cn(
                              "text-lg font-bold",
                              weekDay.isToday ? "text-blue-600" : "text-gray-900"
                            )}
                          >
                            {weekDay.day}
                          </div>
                        </Card>
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-1">
                            {weekDay.tasks.length === 0 ? (
                              <div className="text-center py-4 text-gray-400 text-xs">No tasks</div>
                            ) : (
                              weekDay.tasks.map((task) => (
                                <TaskItem
                                  key={`${task._id}-${weekDay.date.toDateString()}`}
                                  task={task}
                                  date={weekDay.date}
                                  showTaskDetails={showTaskDetails}
                                  navigate={navigate}
                                />
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {calendarView === "day" && (
                <div className="p-4">
                  <div className="max-w-2xl mx-auto">
                    <Card
                      className={cn(
                        "text-center p-4 mb-4",
                        new Date().toDateString() === currentDate.toDateString() &&
                        "bg-blue-50 border-blue-200"
                      )}
                    >
                      <h3 className="text-xl font-bold text-gray-900">
                        {(() => {
                          const date = new Date(currentDate);
                          const day = String(date.getDate()).padStart(2, '0');
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const year = date.getFullYear();
                          return `${day}/${month}/${year}`;
                        })()}
                      </h3>
                    </Card>

                    <div className="space-y-2">
                      {getTasksForDate(currentDate).length === 0 ? (
                        <Card className="border-dashed border-2 border-gray-200">
                          <CardContent className="text-center py-8">
                            <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-gray-500">No tasks scheduled for this day</p>
                          </CardContent>
                        </Card>
                      ) : (
                        getTasksForDate(currentDate).map((task) => (
                          <TaskItem
                            key={`${task._id}-${currentDate.toDateString()}`}
                            task={task}
                            date={currentDate}
                            showTaskDetails={showTaskDetails}
                            navigate={navigate}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ✅ UPDATED: Modern Legend with Cards */}
      <Card className="bg-gradient-to-br from-gray-50 to-white">
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Priority Legend */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-500 rounded-full" />
                <h3 className="text-sm font-semibold text-gray-900">Priority Levels</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2">
                {[
                  { color: 'bg-red-500', label: 'Urgent', ring: 'ring-red-100' },
                  { color: 'bg-orange-500', label: 'High', ring: 'ring-orange-100' },
                  { color: 'bg-yellow-500', label: 'Medium', ring: 'ring-yellow-100' },
                  { color: 'bg-green-500', label: 'Low', ring: 'ring-green-100' }
                ].map(({ color, label, ring }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                  >
                    <div className={`w-2.5 h-2.5 ${color} rounded-full ring-4 ${ring}`} />
                    <span className="text-xs font-medium text-gray-700">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Spans Legend */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-purple-500 rounded-full" />
                <h3 className="text-sm font-semibold text-gray-900">Multi-Day Tasks</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { symbol: '▶', label: 'Start', desc: 'Task begins', color: 'text-green-600', bg: 'bg-green-50' },
                  { symbol: '─', label: 'Ongoing', desc: 'In progress', color: 'text-blue-600', bg: 'bg-blue-50' },
                  { symbol: '◀', label: 'End', desc: 'Task ends', color: 'text-purple-600', bg: 'bg-purple-50' }
                ].map(({ symbol, label, desc, color, bg }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2 px-3 py-2 ${bg} rounded-lg border border-gray-200 hover:shadow-sm transition-shadow`}
                  >
                    <span className={`text-base font-bold ${color}`}>{symbol}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900">{label}</div>
                      <div className="text-[10px] text-gray-500 truncate">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarViewComponent;
