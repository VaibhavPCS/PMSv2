// Excel-upload endpoint module. Endpoints ported VERBATIM from OLD app
// (/excel-upload/**).

import { getRequest, postMultipart } from './client';
import type {
  ExcelGenericResponse,
  ExcelWorkspaceOption,
  ExcelProjectOption,
  ExcelUserOption,
  ExcelParsePreviewResponse,
  ExcelUploadTasksResponse,
} from '@/types';

export const excelUploadApi = {
  // GET /excel-upload/workspaces
  workspaces: () =>
    getRequest<ExcelGenericResponse<ExcelWorkspaceOption[]>>('/excel-upload/workspaces'),

  // GET /excel-upload/workspaces/:workspaceId/projects
  projects: (workspaceId: string) =>
    getRequest<ExcelGenericResponse<ExcelProjectOption[]>>(
      `/excel-upload/workspaces/${workspaceId}/projects`
    ),

  // GET /excel-upload/projects/:projectId/users
  projectUsers: (projectId: string) =>
    getRequest<ExcelGenericResponse<ExcelUserOption[]>>(
      `/excel-upload/projects/${projectId}/users`
    ),

  // GET /excel-upload/projects/:projectId/leads
  projectLeads: (projectId: string) =>
    getRequest<ExcelGenericResponse<ExcelUserOption[]>>(
      `/excel-upload/projects/${projectId}/leads`
    ),

  // POST /excel-upload/parse-preview  (multipart)
  parsePreview: (formData: FormData) =>
    postMultipart<ExcelParsePreviewResponse>('/excel-upload/parse-preview', formData),

  // POST /excel-upload/upload-tasks  (multipart)
  uploadTasks: (formData: FormData) =>
    postMultipart<ExcelUploadTasksResponse>('/excel-upload/upload-tasks', formData),
};
