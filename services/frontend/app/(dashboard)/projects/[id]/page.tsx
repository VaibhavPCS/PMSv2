'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useProject } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { TaskFiltersBar } from '@/components/tasks/TaskFiltersBar';
import { TaskRow } from '@/components/tasks/TaskRow';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { PageSpinner } from '@shared/ui';
import { Button } from '@shared/ui';
import type { TaskFilters } from '@/lib/api/tasks';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useProject(id);
  const [filters, setFilters] = useState<TaskFilters>({ projectId: id });
  const [open, setOpen] = useState(false);
  const { data: tasksRes, isLoading: tasksLoading } = useTasks(filters);

  if (isLoading) return <PageSpinner />;
  if (!project) return <p className="text-sm text-gray-500 p-6">Project not found.</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={project.description}
        actions={
          <>
            <ProjectStatusBadge status={project.status} />
            <Button size="sm" onClick={() => setOpen(true)}>Add Task</Button>
          </>
        }
      />
      <TaskFiltersBar filters={filters} onChange={setFilters} />
      {tasksLoading ? (
        <PageSpinner />
      ) : (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {tasksRes?.data.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">No tasks yet. Add your first task.</p>
          )}
          {tasksRes?.data.map((task) => <TaskRow key={task._id} task={task} />)}
        </div>
      )}
      <CreateTaskModal open={open} onClose={() => setOpen(false)} defaultProjectId={id} />
    </div>
  );
}