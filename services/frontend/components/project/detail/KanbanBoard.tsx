'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DndContext,
  DragOverlay,
  useDroppable,
  type SensorDescriptor,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from './TaskCard';
import type {
  Task,
  CurrentUser,
  AssignableMember,
  Project,
  FilterType,
} from './types';

// ✅ UPDATED: SortableTaskCard with props passing
const SortableTaskCard: React.FC<{
  task: Task;
  currentUser?: CurrentUser | null;
  userRole?: string;
  onTaskUpdate?: () => void;
  assignableMembers?: AssignableMember[];
  canAssignVisible?: boolean;
  project?: Project | null; // ✅ NEW: Add project prop
}> = ({ task, currentUser, userRole, onTaskUpdate, assignableMembers = [], canAssignVisible = false, project }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task._id,
    disabled: (task as any).approvalStatus === 'approved',
  });
  const router = useRouter();

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <TaskCard
        task={task}
        compact={true}
        onClick={() => router.push(`/task/${task._id}`)}
        currentUser={currentUser}
        userRole={userRole}
        project={project}
        onTaskUpdate={onTaskUpdate}
        assignableMembers={assignableMembers}
        canAssignVisible={canAssignVisible}
      />
    </div>
  );
};

const DroppableColumn = ({
  children,
  id,
  title,
  count,
  total,
  color,
}: {
  children: React.ReactNode;
  id: string;
  title: string;
  count: number;
  total: number;
  color: string;
}) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      className={cn(
        'bg-gray-50 rounded-lg p-3 h-full',
        isOver && 'bg-blue-50 ring-2 ring-blue-200'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', color)} />
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        </div>
        <span data-slot="badge" className="inline-flex items-center justify-center rounded-md border py-0.5 font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90 text-xs h-5 px-2">
          {count}
        </span>
      </div>
      {/* Per-column progress: show fraction and visual bar */}
      <div className="mb-3">
        <div className="flex items-center justify-end text-xs text-gray-600 mb-1">
          <span>{count}/{total}</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('h-1.5 rounded-full', color)}
            style={{ width: `${total > 0 ? Math.round((count / total) * 100) : 0}%` }}
          />
        </div>
      </div>
      <div ref={setNodeRef} className="space-y-2 min-h-[20rem]">
        {children}
      </div>
    </div>
  );
};

interface KanbanBoardProps {
  kanbanFilteredTasks: Task[];
  filters: FilterType;
  updateFilter: (key: keyof FilterType, value: string) => void;
  clearFilters: () => void;
  isMobile: boolean;
  isAdmin: boolean;
  isProjectLead: boolean;
  projectRole: string;
  project: Project | null;
  mobileKanbanStatus: 'to-do' | 'in-progress' | 'on-hold' | 'done';
  setMobileKanbanStatus: (status: 'to-do' | 'in-progress' | 'on-hold' | 'done') => void;
  sensors: SensorDescriptor<any>[];
  activeTask: Task | null;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void | Promise<void>;
  currentUser: CurrentUser | null;
  userRole: string;
  onTaskUpdate: () => void;
  filteredAssignableMembers: AssignableMember[];
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  kanbanFilteredTasks,
  filters,
  updateFilter,
  clearFilters,
  isMobile,
  isAdmin,
  isProjectLead,
  projectRole,
  project,
  mobileKanbanStatus,
  setMobileKanbanStatus,
  sensors,
  activeTask,
  onDragStart,
  onDragEnd,
  currentUser,
  userRole,
  onTaskUpdate,
  filteredAssignableMembers,
}) => {
  const showOnHold = isAdmin || isProjectLead || projectRole === 'owner';

  return (
    <div className="space-y-3">
      {/* DESKTOP KANBAN FILTERS */}
      {/* Responsive Kanban Filters */}
      <div className="mb-4">
        {/* Search Bar - Full Width */}
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-700 mb-1.5 block">Search Tasks</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by title or description..."
              className="pl-9 h-9 text-sm"
              value={filters.search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter('search', e.target.value)}
            />
          </div>
        </div>

        {/* Status & Priority - Side by Side */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Status Filter */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Status</label>
            <Select
              value={filters.status}
              onValueChange={(value: string) => updateFilter('status', value)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="to-do">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Priority</label>
            <Select
              value={filters.priority}
              onValueChange={(value: string) => updateFilter('priority', value)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Assignee Filter & Clear Button */}
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-700 mb-1.5 block">Assigned To</label>
          <div className="flex gap-2">
            <Select
              value={filters.assignee}
              onValueChange={(value: string) => updateFilter('assignee', value)}
            >
              <SelectTrigger className="h-9 text-sm flex-1">
                <SelectValue placeholder="All Members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                {project?.members?.map((member: { userId: { _id: string; name: string; email: string } }) => (
                  <SelectItem key={member.userId._id} value={member.userId._id}>
                    {member.userId.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(filters.search || filters.status !== 'all' || filters.priority !== 'all' || filters.assignee !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="h-9 px-3 text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-300 whitespace-nowrap"
              >
                <X className="w-3 h-3 mr-1" />
                Clear All Filters
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Status Filter */}
        {isMobile && (
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-700 mb-1.5 block">View Status</label>
            <Select value={mobileKanbanStatus} onValueChange={(value: 'to-do' | 'in-progress' | 'on-hold' | 'done') => setMobileKanbanStatus(value)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="to-do">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                {showOnHold && (
                  <SelectItem value="on-hold">On Hold</SelectItem>
                )}
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className={cn('grid gap-4 pb-4', isMobile ? 'grid-cols-1' : showOnHold ? 'md:grid-cols-4' : 'md:grid-cols-3')}>
          {/* Show all columns on desktop, only selected status on mobile */}
          {(!isMobile || mobileKanbanStatus === 'to-do') && (
            <DroppableColumn
              id="to-do"
              title="To Do"
              count={kanbanFilteredTasks.filter((t) => t.status === 'to-do').length}
              total={kanbanFilteredTasks.length}
              color="bg-blue-500"
            >
              <SortableContext
                items={kanbanFilteredTasks.filter((t) => t.status === 'to-do').map((t) => t._id)}
                strategy={verticalListSortingStrategy}
              >
                {kanbanFilteredTasks
                  .filter((t) => t.status === 'to-do')
                  .map((task) => (
                    <SortableTaskCard
                      key={task._id}
                      task={task}
                      currentUser={currentUser}
                      userRole={userRole}
                      onTaskUpdate={onTaskUpdate}
                      assignableMembers={filteredAssignableMembers}
                      canAssignVisible={isAdmin || isProjectLead}
                      project={project}
                    />
                  ))}
              </SortableContext>
            </DroppableColumn>
          )}

          {(!isMobile || mobileKanbanStatus === 'in-progress') && (
            <DroppableColumn
              id="in-progress"
              title="In Progress"
              count={kanbanFilteredTasks.filter((t) => t.status === 'in-progress').length}
              total={kanbanFilteredTasks.length}
              color="bg-orange-400"
            >
              <SortableContext
                items={kanbanFilteredTasks.filter((t) => t.status === 'in-progress').map((t) => t._id)}
                strategy={verticalListSortingStrategy}
              >
                {kanbanFilteredTasks
                  .filter((t) => t.status === 'in-progress')
                  .map((task) => (
                    <SortableTaskCard
                      key={task._id}
                      task={task}
                      currentUser={currentUser}
                      userRole={userRole}
                      onTaskUpdate={onTaskUpdate}
                      assignableMembers={filteredAssignableMembers}
                      canAssignVisible={isAdmin || isProjectLead}
                      project={project}
                    />
                  ))}
              </SortableContext>
            </DroppableColumn>
          )}

          {/* ✅ NEW: On Hold Column - Only visible to admins, project leads, and owners */}
          {showOnHold && (!isMobile || mobileKanbanStatus === 'on-hold') && (
            <DroppableColumn
              id="on-hold"
              title="On Hold"
              count={kanbanFilteredTasks.filter((t) => t.status === 'on-hold').length}
              total={kanbanFilteredTasks.length}
              color="bg-yellow-500"
            >
              <SortableContext
                items={kanbanFilteredTasks.filter((t) => t.status === 'on-hold').map((t) => t._id)}
                strategy={verticalListSortingStrategy}
              >
                {kanbanFilteredTasks
                  .filter((t) => t.status === 'on-hold')
                  .map((task) => (
                    <SortableTaskCard
                      key={task._id}
                      task={task}
                      currentUser={currentUser}
                      userRole={userRole}
                      onTaskUpdate={onTaskUpdate}
                      assignableMembers={filteredAssignableMembers}
                      canAssignVisible={isAdmin || isProjectLead}
                      project={project}
                    />
                  ))}
              </SortableContext>
            </DroppableColumn>
          )}

          {(!isMobile || mobileKanbanStatus === 'done') && (
            <DroppableColumn
              id="done"
              title="Done"
              count={kanbanFilteredTasks.filter((t) => t.status === 'done').length}
              total={kanbanFilteredTasks.length}
              color="bg-green-500"
            >
              <SortableContext
                items={kanbanFilteredTasks.filter((t) => t.status === 'done').map((t) => t._id)}
                strategy={verticalListSortingStrategy}
              >
                {kanbanFilteredTasks
                  .filter((t) => t.status === 'done')
                  .map((task) => (
                    <SortableTaskCard
                      key={task._id}
                      task={task}
                      currentUser={currentUser}
                      userRole={userRole}
                      onTaskUpdate={onTaskUpdate}
                      assignableMembers={filteredAssignableMembers}
                      canAssignVisible={isAdmin || isProjectLead}
                      project={project}
                    />
                  ))}
              </SortableContext>
            </DroppableColumn>
          )}
        </div>

        <DragOverlay>
          {activeTask && (
            <TaskCard task={activeTask} compact={true} canAssignVisible={false} />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default KanbanBoard;
