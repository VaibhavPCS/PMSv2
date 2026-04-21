'use client';

import { useProjects } from '@/hooks/useProjects';
import { ProjectCard } from './ProjectCard';
import { PageSpinner } from '@shared/ui';
import { useAuthContext } from '@/providers/AuthProvider';

export function ProjectList() {
  const { user } = useAuthContext();
  const workspaceId =
    typeof user?.currentWorkspace === 'string'
      ? user.currentWorkspace
      : user?.currentWorkspace?._id ?? '';

  const { data, isLoading } = useProjects(workspaceId);

  if (isLoading) return <PageSpinner />;

  if (!data?.data.length) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No projects yet. Create your first project to get started.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.data.map((project) => (
        <ProjectCard key={project._id} project={project} />
      ))}
    </div>
  );
}