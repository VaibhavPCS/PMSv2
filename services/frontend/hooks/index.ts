// Barrel for the react-query data hooks. Import any domain hook from `@/hooks`.
// NOTE: the pre-existing scaffold hooks (useAuth/useProjects/useTasks/use-auth/
// use-permissions) are intentionally left untouched; the comprehensive,
// OLD-app-matching layer is exported from the per-domain files below.

export * from './use-auth-mutations';
export * from './use-workspaces';
export * from './use-projects';
export * from './use-project-members';
export * from './use-tasks';
export * from './use-subtasks';
export * from './use-sprints';
export * from './use-comments';
export * from './use-meetings';
export * from './use-chat';
export * from './use-messages';
export * from './use-notifications';
export * from './use-members';
export * from './use-analytics';
export * from './use-invites';
export * from './use-excel-upload';
