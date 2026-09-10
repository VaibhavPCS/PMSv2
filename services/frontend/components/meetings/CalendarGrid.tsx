'use client';

// Calendar grid (month/week grid + day list). Markup ported VERBATIM from OLD
// app/routes/administration/calendar.tsx (Calendar Grid block), split out to
// keep each file under the 1,000 LOC limit.

import { format, isToday } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  statusColors,
  dayFilterOptions,
  isMultiDayTask,
  getMultiDayIndicator,
  type CalendarTask,
  type ViewMode,
} from './calendar-utils';

interface CalendarGridProps {
  viewMode: ViewMode;
  currentDate: Date;
  calendarDays: Date[];
  dayStatusFilter: string | null;
  setDayStatusFilter: (key: string | null) => void;
  toggleDayStatusFilter: (key: string) => void;
  dayTasks: CalendarTask[];
  getTasksForDay: (date: Date) => CalendarTask[];
  onSelectTask: (task: CalendarTask) => void;
}

export function CalendarGrid({
  viewMode,
  currentDate,
  calendarDays,
  dayStatusFilter,
  setDayStatusFilter,
  toggleDayStatusFilter,
  dayTasks,
  getTasksForDay,
  onSelectTask,
}: CalendarGridProps) {
  return (
    <div className="p-4">
      {viewMode === 'day' ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDayStatusFilter(null)}
              className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${
                !dayStatusFilter
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            {dayFilterOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => toggleDayStatusFilter(option.key)}
                className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${
                  dayStatusFilter === option.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {dayTasks.length > 0 ? (
            dayTasks.map((task) => {
              // Check if task is overdue
              const taskEndDate = new Date(task.dueDate);
              taskEndDate.setHours(23, 59, 59, 999);
              const isOverdue = taskEndDate < new Date() &&
                                task.status !== 'done';

              // Check if overdue but on-hold
              const isOverdueOnHold = isOverdue && task.status === 'on-hold';

              // Determine color key: if on-hold (even if overdue), use 'on-hold' color; else if overdue, use 'overdue'
              const colorKey = isOverdueOnHold ? 'on-hold' : (isOverdue ? 'overdue' : task.status);

              return (
                <div
                  key={task._id}
                  onClick={() => onSelectTask(task)}
                  className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-1 h-12 rounded-full ${statusColors[colorKey as keyof typeof statusColors]?.bg || 'bg-gray-500'}`} />

                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-lg">
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                        <span className="font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-xs">{task.project?.title || 'No Project'}</span>
                        <span>•</span>
                        <span className={`capitalize ${isOverdueOnHold ? 'text-gray-600 font-medium' : (isOverdue ? 'text-red-600 font-medium' : '')}`}>
                        {isOverdueOnHold ? (
                          <span className="flex items-center gap-1">
                            On Hold
                          </span>
                        ) : (isOverdue ? 'Overdue' : task.status.replace('-', ' '))}
                      </span>
                      </div>

                      {/* Display hold reason and datetime for on-hold tasks */}
                      {task.status === 'on-hold' && task.holdHistory && task.holdHistory.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                          <div className="font-medium text-yellow-800 mb-1">Hold Details:</div>
                          <div className="space-y-1">
                            <div><span className="font-medium">Reason:</span> {task.holdHistory[task.holdHistory.length - 1].reason || 'No reason provided'}</div>
                            <div><span className="font-medium">Date:</span> {new Date(task.holdHistory[task.holdHistory.length - 1].putOnHoldAt).toLocaleString()}</div>
                            <div><span className="font-medium">By:</span> {task.holdHistory[task.holdHistory.length - 1].putOnHoldBy.name}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    {/* Assignee */}
                    {task.assignee && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                          {task.assignee.name ? task.assignee.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '??'}
                        </div>
                        <div className="hidden md:block text-gray-700">
                          <div className="font-medium text-xs text-gray-500">Assigned to</div>
                          <div className="text-sm font-medium">{task.assignee.name}</div>
                        </div>
                      </div>
                    )}

                    {/* Priority & Due Date */}
                    <div className="text-right min-w-[100px]">
                      <Badge variant="outline" className={`mb-1 ${
                        task.priority === 'urgent' ? 'text-red-600 border-red-200 bg-red-50' :
                        task.priority === 'high' ? 'text-orange-600 border-orange-200 bg-orange-50' :
                        'text-gray-600'
                      }`}>
                        {task.priority.toUpperCase()}
                      </Badge>
                      <div className={`text-xs font-medium mt-1 ${isOverdue && !isOverdueOnHold ? 'text-red-600' : 'text-gray-500'}`}>
                        Due: {format(new Date(task.dueDate), 'MMM dd')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                <CalendarIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No tasks scheduled</h3>
              <p className="text-gray-500 mt-1">There are no tasks for this day.</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Week Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const cellTasks = getTasksForDay(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isTodayDate = isToday(day);

              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-1 border rounded-lg hover:bg-gray-50 transition-colors ${
                    isTodayDate
                      ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                      : isCurrentMonth
                      ? 'border-gray-100'
                      : 'bg-gray-50/50 text-gray-400 border-gray-100'
                  }`}
                >
                  <div
                    className={`text-sm mb-1 px-1 ${
                      isTodayDate
                        ? 'text-blue-600 font-bold'
                        : isCurrentMonth
                        ? 'font-medium'
                        : 'text-gray-400'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>

                  <div className="space-y-0.5 max-h-20 overflow-y-auto">
                    {cellTasks.map((task) => {
                      const multiDayIndicator = isMultiDayTask(task)
                        ? getMultiDayIndicator(task, day)
                        : null;

                      // Check if task is overdue
                      const taskEndDate = new Date(task.dueDate);
                      taskEndDate.setHours(23, 59, 59, 999);
                      const isOverdue = taskEndDate < new Date() &&
                                        task.status !== 'done';

                      // Check if overdue but on-hold
                      const isOverdueOnHold = isOverdue && task.status === 'on-hold';

                      // Determine color key: if on-hold (even if overdue), use 'on-hold' color; else if overdue, use 'overdue'
                      const colorKey = isOverdueOnHold ? 'on-hold' : (isOverdue ? 'overdue' : task.status);

                      return (
                        <div
                          key={task._id}
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate ${
                            statusColors[colorKey as keyof typeof statusColors]?.bg || 'bg-gray-500'
                          } text-white font-medium cursor-pointer hover:opacity-80`}
                          title={`${task.title} - ${task.project?.title || 'No Project'}${isOverdue && !isOverdueOnHold ? ' (Overdue)' : ''}${task.status === 'on-hold' && task.holdHistory && task.holdHistory.length > 0 ? ` (On Hold: ${task.holdHistory[task.holdHistory.length - 1].reason || 'No reason provided'} - ${new Date(task.holdHistory[task.holdHistory.length - 1].putOnHoldAt).toLocaleString()})` : ''}`}
                          onClick={() => onSelectTask(task)}
                        >
                          {multiDayIndicator && (
                            <span className="mr-0.5">{multiDayIndicator.symbol}</span>
                          )}
                          {task.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
