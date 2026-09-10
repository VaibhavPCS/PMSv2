// Shared types for the Excel-upload feature. Ported VERBATIM from the OLD
// app/components/excel-upload/ExcelUploadComponent.tsx (the local interfaces
// defined at the top of that file). Kept identical so the split presentational
// pieces share the exact same shapes the old single component used.

export interface Workspace {
  _id: string;
  name: string;
  description: string;
  role: string;
}

export interface Project {
  _id: string;
  title: string;
  description: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role?: string;
}

export interface TaskResult {
  row: number;
  taskId?: string;
  title?: string;
  errors?: string[];
}

export interface UploadResult {
  total: number;
  successful: TaskResult[];
  failed: TaskResult[];
}
