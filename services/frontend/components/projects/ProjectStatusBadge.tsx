import { Badge } from '@shared/ui';
import type { ProjectStatus } from '@shared/types';

const statusMap: Record<ProjectStatus, { variant: 'success' | 'info' | 'warning' | 'danger' | 'default'; label: string }> = {
  active:    { variant: 'success', label: 'Active' },
  on_hold:   { variant: 'warning', label: 'On Hold' },
  completed: { variant: 'info',    label: 'Completed' },
  archived:  { variant: 'default', label: 'Archived' },
  cancelled: { variant: 'danger',  label: 'Cancelled' },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { variant, label } = statusMap[status] ?? { variant: 'default', label: status };
  return <Badge variant={variant}>{label}</Badge>;
}