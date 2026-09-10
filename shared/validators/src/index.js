const { z } = require('zod');
const { TASK_STATUS, PRIORITY_LEVELS, ROLES, PROJECT_STATE, PROJECT_STATUS } = require('@pms/constants');

const PasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const UUIDSchema = z.string().uuid('Invalid ID format');

const DateSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date format' }
);

const RegisterSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: PasswordSchema,
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const VerifyEmailSchema = z.object({
  userId: UUIDSchema,
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

const ResendOTPSchema = z.object({
  userId: UUIDSchema,
});

const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const VerifyResetOTPSchema = z.object({
  userId: UUIDSchema,
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

const ResetPasswordSchema = z.object({
  userId: UUIDSchema,
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  newPassword: PasswordSchema,
});

const CreateWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Workspace name is required'),
  description: z.string().optional(),
  color: z.string().min(1, 'Color is required'),
});

const UpdateWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Workspace name cannot be empty').optional(),
  description: z.string().optional(),
  color: z.string().optional(),
});

const InviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum([ROLES.ADMIN, ROLES.PROJECT_HEAD, ROLES.TEAM_LEAD, ROLES.MEMBER]),
});

const AcceptInviteSchema = z.object({
  token: z.string().min(1, 'Invite token is required'),
});

const ChangeMemberRoleSchema = z.object({
  userId: UUIDSchema,
  role: z.enum([ROLES.ADMIN, ROLES.PROJECT_HEAD, ROLES.TEAM_LEAD, ROLES.MEMBER]),
});

const CreateProjectSchema = z.object({
  workspaceId: UUIDSchema,
  name: z.string().trim().min(3, 'Project name must be at least 3 characters'),
  description: z.string().optional(),
  state: z.enum(Object.values(PROJECT_STATE)).optional(),
  startDate: DateSchema,
  endDate: DateSchema,
  tags: z.array(z.string()).optional(),
  members: z.array(
    z.object({
      userId: UUIDSchema,
      role: z.enum(['tl', 'trainee', 'member']),
    })
  ).optional(),
}).refine(
  (o) => new Date(o.endDate) >= new Date(o.startDate),
  { message: 'endDate must be on or after startDate', path: ['endDate'] }
);

const UpdateProjectSchema = z.object({
  name: z.string().trim().min(3).optional(),
  description: z.string().optional(),
  state: z.enum(Object.values(PROJECT_STATE)).optional(),
  projectStatus: z.enum(Object.values(PROJECT_STATUS)).optional(),
  startDate: DateSchema.optional(),
  endDate: DateSchema.optional(),
  tags: z.array(z.string()).optional(),
}).refine(
  (o) => !(o.startDate && o.endDate) || new Date(o.endDate) >= new Date(o.startDate),
  { message: 'endDate must be on or after startDate', path: ['endDate'] }
);

const AddProjectMemberSchema = z.object({
  userId: UUIDSchema,
  role: z.enum(['tl', 'trainee', 'member']),
  reportsTo: UUIDSchema.optional(),
});

const ChangeProjectHeadSchema = z.object({
  userId: UUIDSchema,
});

const ReferenceLinkSchema = z
  .string()
  .url()
  .regex(/^https?:\/\/(www\.)?(figma\.com|github\.com)\//i, 'Only Figma and GitHub links are allowed');

const CreateTaskSchema = z.object({
  title:         z.string().trim().min(1, 'Task title is required'),
  description:   z.string().optional(),
  priority:      z.enum(Object.values(PRIORITY_LEVELS)),
  startDate:     DateSchema,
  dueDate:       DateSchema,
  assignees:     z.array(UUIDSchema).min(1, 'At least one assignee is required'),
  projectId:     UUIDSchema,
  workspaceId:   UUIDSchema,
  projectHeadId: UUIDSchema,
  sprintId:      UUIDSchema.optional(),
  parentTask:    UUIDSchema.optional(),
  referenceLinks: z.array(ReferenceLinkSchema).max(10).optional(),
  isRecurring:        z.boolean().optional().default(false),
  recurringFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  recurringEndDate:   DateSchema.optional(),
}).superRefine((d, ctx) => {
  if (new Date(d.startDate) > new Date(d.dueDate)) {
    ctx.addIssue({ path: ['startDate'], code: 'custom', message: 'startDate must be on or before dueDate' });
  }
  if (d.isRecurring) {
    if (!d.recurringFrequency) {
      ctx.addIssue({ path: ['recurringFrequency'], code: 'custom', message: 'recurringFrequency is required for recurring tasks' });
    }
    if (!d.recurringEndDate) {
      ctx.addIssue({ path: ['recurringEndDate'], code: 'custom', message: 'recurringEndDate is required for recurring tasks' });
    } else if (new Date(d.recurringEndDate) <= new Date(d.dueDate)) {
      ctx.addIssue({ path: ['recurringEndDate'], code: 'custom', message: 'recurringEndDate must be after the due date' });
    }
  }
});

// Only statuses a user can set themselves via UpdateStatus.
// IN_REVIEW, APPROVED, REJECTED, FLAGGED, OVERDUE are set exclusively by service logic.
const UpdateTaskStatusSchema = z.object({
  status: z.enum([
    TASK_STATUS.PENDING,
    TASK_STATUS.IN_PROGRESS,
    TASK_STATUS.COMPLETED,
    TASK_STATUS.ON_HOLD,
  ]),
  reason: z.string().optional(),
  newEndDate: DateSchema.optional(),
}).superRefine((d, ctx) => {
  if (d.status === TASK_STATUS.ON_HOLD && !d.reason?.trim()) {
    ctx.addIssue({ path: ['reason'], code: 'custom', message: 'A reason is required to put a task on hold' });
  }
});

// General task edit (title/description/priority/dates, optional status).
// All fields optional so the frontend can send partial updates; status is
// constrained to the user-settable set (mirrors UpdateTaskStatusSchema).
const UpdateTaskSchema = z.object({
  title:       z.string().trim().min(1, 'Task title cannot be empty').optional(),
  description: z.string().optional(),
  priority:    z.enum(Object.values(PRIORITY_LEVELS)).optional(),
  startDate:   DateSchema.optional(),
  dueDate:     DateSchema.optional(),
  status: z.enum([
    TASK_STATUS.PENDING,
    TASK_STATUS.IN_PROGRESS,
    TASK_STATUS.COMPLETED,
    TASK_STATUS.ON_HOLD,
  ]).optional(),
}).superRefine((d, ctx) => {
  if (d.startDate && d.dueDate && new Date(d.startDate) > new Date(d.dueDate)) {
    ctx.addIssue({ path: ['startDate'], code: 'custom', message: 'startDate must be on or before dueDate' });
  }
});

const HoldTaskSchema = z.object({
  reason: z.string().trim().min(1, 'A reason is required to put a task on hold'),
});

const ApproveTaskSchema = z.object({
  comment: z.string().optional(),
});

const RejectTaskSchema = z.object({
  reason:     z.string().min(1, 'Rejection reason is required'),
  rejectTo:   UUIDSchema,
  newDueDate: DateSchema,
});

const ReassignTaskSchema = z.object({
  assigneeId: UUIDSchema,
  dueDate:    DateSchema,
});

const HandoverSchema = z.object({
  notes: z.string().min(1, 'Handover notes are required'),
  handoverTo: UUIDSchema,
});

const CreateSprintSchema = z.object({
  name: z.string().trim().min(1, 'Sprint name is required').max(100, 'Sprint name cannot exceed 100 characters'),
  projectId: UUIDSchema,
  startDate: DateSchema,
  endDate: DateSchema,
  goal: z.string().trim().max(500, 'Sprint goal cannot exceed 500 characters').optional(),
}).refine(
  (o) => new Date(o.endDate) > new Date(o.startDate),
  { message: 'endDate must be after startDate', path: ['endDate'] }
);

const UpdateSprintSchema = z.object({
  name: z.string().trim().min(1).max(100, 'Sprint name cannot exceed 100 characters').optional(),
  startDate: DateSchema.optional(),
  endDate: DateSchema.optional(),
  goal: z.string().trim().max(500, 'Sprint goal cannot exceed 500 characters').optional(),
}).refine(
  (o) => !(o.startDate && o.endDate) || new Date(o.endDate) > new Date(o.startDate),
  { message: 'endDate must be after startDate', path: ['endDate'] }
);

const CreateMeetingSchema = z.object({
  title: z.string().min(1, 'Meeting title is required'),
  description: z.string().optional(),
  startTime: DateSchema,
  endTime: DateSchema,
  participants: z.array(UUIDSchema).min(1, 'At least one participant is required'),
  workspaceId: UUIDSchema,
  meetingLink: z.string().url('Invalid meeting URL').optional(),
});

const UpdateMeetingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startTime: DateSchema.optional(),
  endTime: DateSchema.optional(),
  meetingLink: z.string().url().optional(),
});

const RsvpSchema = z.object({
  response: z.enum(['accepted', 'declined', 'tentative']),
});

const CreateChatSchema = z.object({
  name: z.string().min(1, 'Chat name is required'),
  workspaceId: UUIDSchema,
  participants: z.array(UUIDSchema).min(1, 'At least one participant is required'),
  isGroup: z.boolean().optional().default(false),
});

const UpdateChatSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

const AddParticipantSchema = z.object({
  userId: UUIDSchema,
  role: z.enum(['admin', 'member']).optional().default('member'),
});

const SendMessageSchema = z.object({
  chatId: UUIDSchema,
  content: z.string().min(1, 'Message content is required'),
  replyTo: UUIDSchema.optional(),
});

const EditMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
});

const ExtendProjectDeadlineSchema = z.object({
  newEndDate: DateSchema,
  reason:     z.string().min(10, 'A reason of at least 10 characters is required'),
});

// ─── Excel / CSV bulk task import ─────────────────────────────────────────────

const ImportTaskRowSchema = z.object({
  title:       z.string().trim().min(1, 'title is required'),
  description: z.string().optional(),
  priority:    z.enum(Object.values(PRIORITY_LEVELS)),
  dueDate:     DateSchema,
  assignees:   z.array(z.string().min(1)).min(1, 'at least one assignee is required'),
  sprintId:    UUIDSchema.optional(),
});

const ImportTasksSchema = z.object({
  projectId:     UUIDSchema,
  workspaceId:   UUIDSchema,
  projectHeadId: UUIDSchema.optional(),
  rows:          z.array(ImportTaskRowSchema).min(1, 'at least one row is required').max(1000, 'Maximum 1000 rows per import'),
});

// ─── Pagination helper ────────────────────────────────────────────────────────

const PaginationSchema = z.object({
  page:  z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// ─── Query schemas ────────────────────────────────────────────────────────────

const GetTasksQuerySchema = PaginationSchema.extend({
  projectId: UUIDSchema.optional(),
  sprintId:  UUIDSchema.optional(),
  status:    z.enum(Object.values(TASK_STATUS)).optional(),
});

const GetSprintsQuerySchema = z.object({
  projectId: UUIDSchema,
});

// workspaceId is OPTIONAL: the frontend api client sends the active workspace in
// the 'workspace-id' request header, so the controller falls back to it when the
// query param is absent (the projects list page sends no query at all).
const GetProjectsQuerySchema = PaginationSchema.extend({
  workspaceId: UUIDSchema.optional(),
});

// Recent-projects query for the dashboard. workspaceId is OPTIONAL here because
// the real source is the 'workspace-id' request header (the controller falls back
// to req.query.workspaceId). limit is raised to 1000 to accept the dashboard's
// fetchAccessibleProjects(limit=1000); sortBy is constrained to an allowlist so
// it can be handed straight to prisma orderBy without injection risk.
const RecentProjectsQuerySchema = z.object({
  page:        z.coerce.number().int().min(1).optional().default(1),
  limit:       z.coerce.number().int().min(1).max(1000).optional().default(20),
  workspaceId: UUIDSchema.optional(),
  sortBy:      z.enum(['startDate', 'endDate', 'createdAt']).optional().default('startDate'),
  projectType: z.string().optional(),
});

// All filters OPTIONAL: the meetings list page sends no query — workspaceId comes
// from the 'workspace-id' header (controller fallback) and the controller/service
// default the [from,to] window when omitted. When both bounds ARE supplied they
// must still be valid and ordered.
const GetMeetingsQuerySchema = PaginationSchema.extend({
  workspaceId: UUIDSchema.optional(),
  from:        z.string().datetime({ message: 'from must be a valid ISO datetime' }).optional(),
  to:          z.string().datetime({ message: 'to must be a valid ISO datetime' }).optional(),
}).refine((obj) => !obj.from || !obj.to || new Date(obj.to) >= new Date(obj.from), {
  message: 'to must be on or after from',
  path: ['to'],
});

const ValidateRequest = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(
        (e) => `${e.path.join('.')}: ${e.message}`
      );
      return res.status(422).json({
        status: 'fail',
        message: `Validation failed. ${errors.join('. ')}`,
      });
    }
    req.body = result.data;
    next();
  };
};

const ValidateParams = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const errors = result.error.issues.map(
        (e) => `${e.path.join('.')}: ${e.message}`
      );
      return res.status(422).json({
        status: 'fail',
        message: `Validation failed. ${errors.join('. ')}`,
      });
    }
    req.params = result.data;
    next();
  };
};

const ValidateQuery = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = result.error.issues.map(
        (e) => `${e.path.join('.')}: ${e.message}`
      );
      return res.status(422).json({
        status: 'fail',
        message: `Validation failed. ${errors.join('. ')}`,
      });
    }
    req.query = result.data;
    next();
  };
};

/**
 * Parses and sanitises page/limit values from a query object.
 * Centralises pagination logic so each service doesn't have to repeat it.
 *
 * @param {{ page?: number|string, limit?: number|string }} query
 * @returns {{ safePage: number, safeLimit: number }}
 */
const parsePagination = ({ page = 1, limit = 20 } = {}) => ({
  safePage:  Math.max(1, Number(page)),
  safeLimit: Math.min(100, Math.max(1, Number(limit))),
});

module.exports = {
  ValidateRequest,
  ValidateParams,
  ValidateQuery,
  parsePagination,
  PasswordSchema,
  UUIDSchema,
  DateSchema,
  ReferenceLinkSchema,
  ImportTaskRowSchema,
  ImportTasksSchema,
  PaginationSchema,
  GetTasksQuerySchema,
  GetSprintsQuerySchema,
  GetProjectsQuerySchema,
  RecentProjectsQuerySchema,
  GetMeetingsQuerySchema,
  RegisterSchema,
  LoginSchema,
  VerifyEmailSchema,
  ResendOTPSchema,
  ForgotPasswordSchema,
  VerifyResetOTPSchema,
  ResetPasswordSchema,
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  InviteMemberSchema,
  AcceptInviteSchema,
  ChangeMemberRoleSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  AddProjectMemberSchema,
  ChangeProjectHeadSchema,
  ExtendProjectDeadlineSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  HoldTaskSchema,
  UpdateTaskStatusSchema,
  ApproveTaskSchema,
  RejectTaskSchema,
  ReassignTaskSchema,
  HandoverSchema,
  CreateSprintSchema,
  UpdateSprintSchema,
  CreateMeetingSchema,
  UpdateMeetingSchema,
  RsvpSchema,
  CreateChatSchema,
  UpdateChatSchema,
  AddParticipantSchema,
  SendMessageSchema,
  EditMessageSchema,
};
