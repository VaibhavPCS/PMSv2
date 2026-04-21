'use client';

import Link from 'next/link';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProjects } from '@/hooks/useProjects';
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { Spinner } from '@shared/ui';
import { ROUTES } from '@shared/constants';

export function RecentProjects() {
  const { user } = useAuthContext();
  const workspaceId =
    typeof user?.currentWorkspace === 'string'
      ? user.currentWorkspace
      : user?.currentWorkspace?._id ?? '';

  const { data, isLoading } = useProjects(workspaceId, 1, 5);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Recent Projects</h2>
        <Link href={ROUTES.PROJECTS} className="text-xs text-blue-600 hover:underline">View all</Link>
      </div>
      {isLoading ? <Spinner className="mx-auto" /> : (
        <div className="space-y-2">
          {data?.data.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No projects yet.</p>}
          {data?.data.map((p) => (
            <Link key={p._id} href={ROUTES.PROJECT(p._id)}
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-sm text-gray-800 truncate">{p.name}</span>
              <ProjectStatusBadge status={p.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}