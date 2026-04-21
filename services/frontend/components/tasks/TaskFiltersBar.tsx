'use client';

import { Select } from '@shared/ui';
import type { TaskFilters } from '@/lib/api/tasks';
import type { SelectOption } from '@shared/ui';

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'todo',        label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review',   label: 'In Review' },
  { value: 'done',        label: 'Done' },
  { value: 'blocked',     label: 'Blocked' },
];

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'low',      label: 'Low' },
  { value: 'medium',   label: 'Medium' },
  { value: 'high',     label: 'High' },
  { value: 'critical', label: 'Critical' },
];

interface Props {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
}

export function TaskFiltersBar({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="w-40">
        <Select
          placeholder="All Statuses"
          options={STATUS_OPTIONS}
          value={filters.status ?? ''}
          onChange={(e) =>
            onChange({ ...filters, status: (e.target.value as TaskFilters['status']) || undefined })
          }
        />
      </div>
      <div className="w-40">
        <Select
          placeholder="All Priorities"
          options={PRIORITY_OPTIONS}
          value={filters.priority ?? ''}
          onChange={(e) =>
            onChange({ ...filters, priority: (e.target.value as TaskFilters['priority']) || undefined })
          }
        />
      </div>
    </div>
  );
}