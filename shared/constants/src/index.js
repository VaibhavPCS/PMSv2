const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const MINUTE_MS = 60000;
const OTP_COOLDOWN_MS = 60000;
const OTP_EXPIRY_MS = 300000;
const JWT_EXPIRY = "8h";
const PASSWORD_MIN_LENGTH = 12;
const OTP_LENGTH = 6;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const TASK_STATUS = {
    PENDING: "pending",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed",
    REJECTED: "rejected",
    APPROVED: "approved",
    ON_HOLD: "on_hold",
    OVERDUE: "overdue",
    HANDOVER: "handover",
}
const PRIORITY_LEVELS = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    URGENT: "urgent",
    CRITICAL: "critical",
}
const PROJECT_STATUS = {
    ON_TRACK: 'on_track',
    AT_RISK: 'at_risk',
    OFF_TRACK: 'off_track',
    COMPLETED: 'completed',
}
const ROLES = {
    OWNER:        'owner',
    SUPER_ADMIN:  'super_admin',
    ADMIN:        'admin',
    PROJECT_HEAD: 'project_head',
    TEAM_LEAD:    'team_lead',
    MEMBER:       'member',
}
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 3;
const ALLOWED_FILE_TYPES = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv"
];

const TOPICS = {
    AUTH_EVENTS: 'pms.auth.events',
    WORKSPACE_EVENTS: 'pms.workspace.events',
    PROJECT_EVENTS: 'pms.project.events',
    TASK_EVENTS: 'pms.task.events',
    SPRINT_EVENTS: 'pms.sprint.events',
    COMMS_EVENTS: 'pms.comms.events',
    NOTIFICATION_EVENTS: 'pms.notification.events',
    FILE_EVENTS: 'pms.file.events',
    MEETING_EVENTS: 'pms.meeting.events',
    ANALYTICS_EVENTS: 'pms.analytics.events',
}

const ANALYTICS_JOB_TYPES = {
    EMPLOYEE_METRICS: 'UPDATE_EMPLOYEE_METRICS',
    PROJECT_METRICS: 'UPDATE_PROJECT_METRICS',
    WORKSPACE_METRICS: 'UPDATE_WORKSPACE_METRICS',
    LEADER_METRICS: 'UPDATE_LEADER_METRICS',
    TASK_LIFECYCLE: 'UPDATE_TASK_LIFECYCLE',
}

const PROJECT_STATE = {                                                                                                                                           
    PLANNING:    'Planning',                                                                                                                                      
    IN_PROGRESS: 'In Progress',                                                                                                                                     
    ON_HOLD:     'On Hold',
    COMPLETED:   'Completed',                                                                                                                                       
    CANCELLED:   'Cancelled',                                                                                                                                     
  }

module.exports = {
    DAY_MS,
    HOUR_MS,
    MINUTE_MS,
    OTP_COOLDOWN_MS,
    OTP_EXPIRY_MS,
    JWT_EXPIRY,
    PASSWORD_MIN_LENGTH,
    OTP_LENGTH,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    TASK_STATUS,
    PRIORITY_LEVELS,
    PROJECT_STATUS,
    ROLES,
    MAX_FILE_SIZE,
    MAX_FILES_PER_UPLOAD,
    ALLOWED_FILE_TYPES,
    TOPICS,
    ANALYTICS_JOB_TYPES,
    PROJECT_STATE,
    INVITE_EXPIRY_MS
};