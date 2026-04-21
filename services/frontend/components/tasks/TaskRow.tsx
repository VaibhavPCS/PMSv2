import Link from 'next/link';
import { Badge } from '@shared/ui';
import { ROUTES } from '@shared/constants';
import type { Task } from '@shared/types';

const statusVariant: Record<Task['status'], 'default' | 'info' | 'warning' | 'success' | 'danger' | 'purple'> = {
  todo:        'default',
  in_progress: 'info',
  in_review:   'purple',
  done:        'success',
  blocked:     'danger',
};

const priorityVariant: Record<Task['priority'], 'default' | 'info' | 'warning' | 'danger' | 'success' | 'purple'> = {
  low:      'default',
  medium:   'info',
  high:     'warning',
  critical: 'danger',
};

export function TaskRow({ task }: { task: Task }) {
  const assigneeName =
    task.assignee && typeof task.assignee !== 'string' ? task.assignee.name : '—';

  return (
    <Link
      href={ROUTES.TASK(task._id)}
      className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
        {task.dueDate && (
          <p className="text-xs text-gray-400 mt-0.5">
            Due {new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </p>
        )}
      </div>
      <span className="text-xs text-gray-500 hidden sm:block shrink-0">{assigneeName}</span>
      <Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge>
      <Badge variant={statusVariant[task.status]}>{task.status.replace('_', ' ')}</Badge>
    </Link>
  );
}