'use client';

// Task Detail route — thin client wrapper.
//
// Mirrors the OLD app/routes/task/task-detail.tsx screen. All data, state,
// realtime (socket.io-client) and mutation logic live in the
// `useTaskDetail` hook (components/task/detail/useTaskDetail.ts); the UI is
// composed by the `TaskDetailClient` orchestrator (built in parts 2/3), which
// spreads the hook's `UseTaskDetailReturn` into the six sub-sections
// (Header / Body / Sidebar / Comments / SubtasksSection / Activity).
//
// This page intentionally stays thin: the dynamic `[id]` param is read inside
// the hook via `useParams()`, so the wrapper just mounts the orchestrator.

import TaskDetailClient from '@/components/task/detail/TaskDetailClient';

export default function TaskDetailPage() {
  return <TaskDetailClient />;
}
