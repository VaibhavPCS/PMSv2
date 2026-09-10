'use client';

// Task calendar container. Logic + header/controls markup ported VERBATIM from
// OLD app/routes/administration/calendar.tsx; the grid, legend and task-detail
// modal are split into sibling components to keep every file under 1,000 LOC.
// Raw axios calls use the shared apiClient (mirrors the OLD `@/lib/axios`).

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from 'date-fns';
import { apiClient } from '@/lib/api/client';
import {
  type CalendarTask,
  type CalendarWorkspace,
  type ViewMode,
} from './calendar-utils';
import { CalendarGrid } from './CalendarGrid';
import { CalendarLegend } from './CalendarLegend';
import { TaskDetailModal } from './TaskDetailModal';

export function MeetingsCalendarView() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // State
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [workspaces, setWorkspaces] = useState<CalendarWorkspace[]>([]);
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [dayStatusFilter, setDayStatusFilter] = useState<string | null>(null);

  const toggleDayStatusFilter = (key: string) => {
    setDayStatusFilter((prev) => (prev === key ? null : key));
  };

  // Fetch workspaces on mount
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const response = await apiClient.get('/workspace');
        const wl = (response?.data?.data ?? response?.data ?? response?.data?.workspaces ?? []) as any[];
        setWorkspaces(wl);
        if (wl?.length > 0) {
          const workspaceId = wl[0].workspaceId._id;
          setSelectedWorkspace(workspaceId);
        }
      } catch (error) {
        console.error('Failed to fetch workspaces:', error);
      }
    };

    fetchWorkspaces();
  }, []);

  // Fetch tasks when workspace or date changes
  useEffect(() => {
    const fetchTasks = async () => {
      if (!selectedWorkspace || !isAuthenticated) {
        return;
      }

      try {
        setLoading(true);

        // Unified endpoint for all users (backend handles hierarchy)
        const endpoint = `/task/calendar/${selectedWorkspace}`;
        const statusFilterParam = viewMode === 'day' && dayStatusFilter ? dayStatusFilter : undefined;

        const response = await apiClient.get(endpoint, {
          params: {
            startDate: format(currentDate, 'yyyy-MM-dd'),
            viewMode,
            ...(statusFilterParam ? { statusFilter: statusFilterParam } : {}),
          },
        });

        const tl = (response?.data?.data ?? response?.data ?? response?.data?.tasks ?? []) as any[];
        setTasks(tl);
      } catch (error: any) {
        console.error('Failed to fetch tasks:', error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [selectedWorkspace, currentDate, viewMode, isAuthenticated, isAdmin, dayStatusFilter]);

  // Navigation handlers
  const handlePrevious = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  // Get calendar days
  const calendarDays = useMemo(() => {
    if (viewMode === 'month') {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      return eachDayOfInterval({ start, end });
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return eachDayOfInterval({ start, end });
    } else {
      return [currentDate];
    }
  }, [currentDate, viewMode]);

  // Filter tasks for a specific day
  const getTasksForDay = (date: Date) => {
    // Normalize the check date to start of day
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // Is today?
    const isTodayDate = isToday(checkDate);

    const dayTasks = tasks.filter((task) => {
      // Normalize start date
      const taskStartDate = task.startDate ? new Date(task.startDate) : new Date(task.dueDate);
      taskStartDate.setHours(0, 0, 0, 0);

      // Normalize end date to end of day
      const taskEndDate = new Date(task.dueDate);
      taskEndDate.setHours(23, 59, 59, 999);

      // Check if the check date falls within the task duration
      const isInRange = checkDate >= taskStartDate && checkDate <= taskEndDate;

      // Check if task is overdue and active (should appear on today if not already shown)
      const isOverdue = taskEndDate < new Date() &&
                        task.status !== 'done';

      // Check if task is overdue but on-hold (should also appear)
      const isOverdueOnHold = isOverdue && task.status === 'on-hold';

      // If today is the current view date, show overdue tasks (both regular overdue and overdue on-hold)
      if (isTodayDate && (isOverdue || isOverdueOnHold)) {
        return true;
      }

      return isInRange;
    });
    return dayTasks;
  };

  const matchesDayStatusFilter = (task: CalendarTask) => {
    if (!dayStatusFilter) return true;
    const taskEndDate = new Date(task.dueDate);
    taskEndDate.setHours(23, 59, 59, 999);
    const isOverdue = taskEndDate < new Date() && task.status !== 'done' && task.status !== 'on-hold';
    const isDoneUnapproved = task.status === 'done' && task.approvalStatus !== 'approved';

    if (dayStatusFilter === 'on-hold') return task.status === 'on-hold';
    if (dayStatusFilter === 'overdue') return isOverdue;
    if (dayStatusFilter === 'to-do') return task.status === 'to-do' && !isOverdue;
    if (dayStatusFilter === 'in-progress') return task.status === 'in-progress' && !isOverdue;
    if (dayStatusFilter === 'done-unapproved') return isDoneUnapproved;
    return false;
  };

  const dayTasks = viewMode === 'day' ? getTasksForDay(currentDate).filter(matchesDayStatusFilter) : [];

  const selectedWorkspaceName = workspaces.find((w) => w.workspaceId._id === selectedWorkspace)?.workspaceId.name || 'Select Workspace';

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Task Calendar</h1>
            <p className="text-gray-600 text-sm mt-1">
              View and manage tasks across all workspaces
            </p>
          </div>

          {/* Workspace Selector */}
          <div className="relative">
            <button
              onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
              className="w-[200px] flex items-center justify-between rounded-[5px] pl-[12px] pr-0 py-[10px] transition-colors text-[#717182] hover:bg-[#e6e8ec] border border-gray-200"
            >
              <div className="flex items-center gap-[12px]">
                <CalendarIcon className="w-[20px] h-[20px]" />
                <span className="font-['Inter:Medium',sans-serif] text-[14px] tracking-[0.5px] leading-[normal] truncate">
                  {selectedWorkspaceName}
                </span>
              </div>
              <ChevronDown className="w-[24px] h-[24px] transition-transform" />
            </button>

            {workspaceDropdownOpen && (
              <div className="absolute right-0 mt-2 w-[250px] bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-[300px] overflow-y-auto">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.workspaceId._id}
                    onClick={() => {
                      setSelectedWorkspace(workspace.workspaceId._id);
                      setWorkspaceDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                      selectedWorkspace === workspace.workspaceId._id ? 'bg-blue-50 text-blue-600 font-medium' : ''
                    }`}
                  >
                    {workspace.workspaceId.name}
                  </button>
                ))}
                {workspaces.length === 0 && (
                  <div className="px-4 py-6 text-center text-gray-500">
                    No workspaces available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Calendar Controls */}
        <Card className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Navigation Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 justify-center sm:justify-start">
                  <button
                    onClick={handlePrevious}
                    className="inline-flex items-center justify-center h-9 w-9 p-0 rounded-lg border bg-background shadow-xs hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900 min-w-[150px] text-center">
                      {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
                      {viewMode === 'week' && `Week ${format(currentDate, 'w')}, ${format(currentDate, 'yyyy')}`}
                      {viewMode === 'day' && format(currentDate, 'EEEE, dd MMMM yyyy')}
                    </h2>
                  </div>

                  <button
                    onClick={handleNext}
                    className="inline-flex items-center justify-center h-9 w-9 p-0 rounded-lg border bg-background shadow-xs hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* View Mode Selector */}
              <div className="flex items-center justify-center sm:justify-start">
                <div className="inline-flex bg-gray-100 rounded-lg p-1 gap-1">
                  <button
                    onClick={() => setViewMode('month')}
                    className={`h-8 px-4 text-xs font-medium capitalize rounded-md transition-all ${
                      viewMode === 'month'
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    month
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`h-8 px-4 text-xs font-medium capitalize rounded-md transition-all ${
                      viewMode === 'week'
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    week
                  </button>
                  <button
                    onClick={() => setViewMode('day')}
                    className={`h-8 px-4 text-xs font-medium capitalize rounded-md transition-all ${
                      viewMode === 'day'
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    day
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <Card className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
          <CardContent className="p-0">
            <CalendarGrid
              viewMode={viewMode}
              currentDate={currentDate}
              calendarDays={calendarDays}
              dayStatusFilter={dayStatusFilter}
              setDayStatusFilter={setDayStatusFilter}
              toggleDayStatusFilter={toggleDayStatusFilter}
              dayTasks={dayTasks}
              getTasksForDay={getTasksForDay}
              onSelectTask={setSelectedTask}
            />
          </CardContent>
        </Card>

        {/* Legend */}
        <CalendarLegend />

        {/* Loading State */}
        {loading && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-700">Loading tasks...</span>
              </div>
            </div>
          </div>
        )}

        {/* Task Detail Modal */}
        <TaskDetailModal selectedTask={selectedTask} onClose={() => setSelectedTask(null)} />
      </div>
    </div>
  );
}
