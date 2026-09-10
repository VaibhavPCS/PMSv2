// Shared types for the legacy collapsible Sidebar (split out of the 936-LOC file).

export interface LegacyNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  sender?: {
    _id: string;
    name: string;
    email: string;
  };
  data: {
    workspaceId?: string;
    projectId?: string;
    taskId?: string;
    meetingId?: string;
    inviteId?: string;
  };
  relatedTask?: string;
  relatedComment?: string;
  createdAt: string;
  readAt?: string;
}

export interface LegacyUserInfo {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}
