'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TaskFiltersBar } from '@/components/tasks/TaskFiltersBar';
import { TaskRow } from '@/components/tasks/TaskRow';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { Button, PageSpinner } from '@shared/ui';
import { useTasks } from '@/hooks/useTasks';
import type { TaskFilters } from '@/lib/api/tasks';

export default function TasksPage() {
  const [filters, setFilters] = useState<TaskFilters>({});
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useTasks(filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="All tasks across your projects"
        actions={<Button onClick={() => setOpen(true)}>New Task</Button>}
      />
      <TaskFiltersBar filters={filters} onChange={setFilters} />
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {data?.data.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">No tasks found.</p>
          )}
          {data?.data.map((task) => <TaskRow key={task._id} task={task} />)}
        </div>
      )}
      <CreateTaskModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}