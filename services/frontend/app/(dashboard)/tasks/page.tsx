'use client';

// "My Tasks" route (Next.js App Router). Thin client wrapper composing the
// MyTasksView sub-component, which owns all state/data and markup. The OLD app
// shipped only a "My Tasks" text placeholder here; this builds the real task
// list/board using the dashboard task-card visual language.

import { MyTasksView } from '@/components/task/MyTasksView';

export default function TasksPage() {
  return <MyTasksView />;
}
