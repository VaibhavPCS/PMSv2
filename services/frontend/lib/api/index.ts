// Barrel for the data-access layer. Re-exports the typed request helpers (from
// the existing client.ts) plus every domain endpoint module and the shared
// query-key registry. Import everything from `@/lib/api`.

export {
  apiClient,
  getRequest,
  postRequest,
  putRequest,
  patchRequest,
  deleteRequest,
  postMultipart,
} from './client';

export { queryKeys } from './query-keys';

export { authApi } from './auth';
export { workspacesApi } from './workspaces';
export { projectsApi } from './projects';
export { projectMembersApi } from './project-members';
export { tasksApi } from './tasks';
export { subtasksApi } from './subtasks';
export { sprintsApi } from './sprints';
export { commentsApi } from './comments';
export { meetingsApi } from './meetings';
export { chatApi } from './chat';
export { messagesApi } from './messages';
export { notificationsApi } from './notifications';
export { membersApi } from './members';
export { analyticsApi } from './analytics';
export { invitesApi } from './invites';
export { excelUploadApi } from './excel-upload';

// Payload / param types
export type { RegisterPayload, LoginPayload } from './auth';
export type { CreateWorkspacePayload, UpdateWorkspacePayload } from './workspaces';
export type { CreateProjectPayload, UpdateProjectPayload } from './projects';
export type {
  AddProjectMemberPayload,
  UpdateProjectMemberPayload,
} from './project-members';
export type { CreateTaskPayload, UpdateTaskPayload } from './tasks';
export type { CreateSubtaskPayload } from './subtasks';
export type { CreateSprintPayload, UpdateSprintPayload } from './sprints';
export type { CreateMeetingPayload, UpdateMeetingPayload } from './meetings';
export type { CreateChatPayload } from './chat';
export type { SendMessagePayload } from './messages';
export type {
  EmployeeListParams,
  PerformanceParams,
} from './analytics';
