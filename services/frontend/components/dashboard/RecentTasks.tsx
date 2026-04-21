'use client';

import Link from 'next/link';
import { useTasks } from '@/hooks/useTasks';
import { Badge, Spinner } from '@shared/ui';
import { ROUTES } from '@shared/constants';
import type { Task } from '@shared/types';

const statusVariant: Record<Task['status'], 'default' | 'info' | 'warning' | 'success' | 'danger' | 'purple'> = {
  todo:        'default',
  in_progress: 'info',
  in_review:   'purple',
  done:        'success',
  blocked:     'danger',
};

export function RecentTasks() {
  const { data, isLoading } = useTasks({ limit: 5 });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Recent Tasks</h2>
        <Link href={ROUTES.TASKS} className="text-xs text-blue-600 hover:underline">View all</Link>
      </div>
      {isLoading ? <Spinner className="mx-auto" /> : (
        <div className="space-y-2">
          {data?.data.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No tasks yet.</p>}
          {data?.data.map((t) => (
            <Link key={t._id} href={ROUTES.TASK(t._id)}
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-sm text-gray-800 truncate flex-1 mr-2">{t.title}</span>
              <Badge variant={statusVariant[t.status]}>{t.status.replace('_', ' ')}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}