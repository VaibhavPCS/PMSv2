export { apiClient, getRequest, postRequest, putRequest, patchRequest, deleteRequest, postMultipart } from './client';
export { authApi } from './auth';
export { projectsApi } from './projects';
export { tasksApi } from './tasks';
export type { CreateProjectPayload, UpdateProjectPayload } from './projects';
export type { CreateTaskPayload, UpdateTaskPayload, TaskFilters } from './tasks';
export type { User } from '@shared/types';