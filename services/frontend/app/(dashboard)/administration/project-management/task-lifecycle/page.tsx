// Task Lifecycle route (Next.js App Router port of
// OLD app/routes/administration/project-management/task-lifecycle.tsx).
// Thin wrapper composing TaskLifecycleView, which owns all markup.

import { TaskLifecycleView } from '@/components/administration/task-lifecycle/TaskLifecycleView';

export default function TaskLifecyclePage() {
  return <TaskLifecycleView />;
}
