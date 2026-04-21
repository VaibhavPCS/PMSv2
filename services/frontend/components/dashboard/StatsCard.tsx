'use client';

import { useAuthContext } from '@/providers/AuthProvider';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { Spinner } from '@shared/ui';
import { FolderOpen, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface StatItem { label: string; value: number; icon: React.ReactNode; color: string; }

export function StatsCard() {
  const { user } = useAuthContext();
  const workspaceId =
    typeof user?.currentWorkspace === 'string'
      ? user.currentWorkspace
      : user?.currentWorkspace?._id ?? '';

  const { data: projects, isLoading: pLoading } = useProjects(workspaceId);
  const { data: tasks,    isLoading: tLoading } = useTasks({});

  if (pLoading || tLoading) return <Spinner className="mx-auto" />;

  const stats: StatItem[] = [
    { label: 'Total Projects', value: projects?.total ?? 0,
      icon: <FolderOpen size={20} />, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Tasks', value: tasks?.total ?? 0,
      icon: <Clock size={20} />, color: 'text-purple-600 bg-purple-50' },
    { label: 'Completed', value: tasks?.data.filter((t) => t.status === 'done').length ?? 0,
      icon: <CheckCircle size={20} />, color: 'text-green-600 bg-green-50' },
    { label: 'Blocked', value: tasks?.data.filter((t) => t.status === 'blocked').length ?? 0,
      icon: <AlertTriangle size={20} />, color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon, color }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${color}`}>{icon}</div>
          <div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}