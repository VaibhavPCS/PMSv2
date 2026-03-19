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
  name: z.string().min(1, 'Workspace name is required'),
  description: z.string().optional(),
  color: z.string().min(1, 'Color is required'),
});

const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).optional(),
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
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().optional(),
  state: z.enum(Object.values(PROJECT_STATE)).optional(),
  startDate: DateSchema,
  endDate: DateSchema.optional(),
  tags: z.array(z.string()).optional(),
  members: z.array(
    z.object({
      userId: UUIDSchema,
      role: z.enum(['tl', 'trainee', 'member']),
    })
  ).optional(),
});

const UpdateProjectSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  state: z.enum(Object.values(PROJECT_STATE)).optional(),
  projectStatus: z.enum(Object.values(PROJECT_STATUS)).optional(),
  startDate: DateSchema.optional(),
  endDate: DateSchema.optional(),
  tags: z.array(z.string()).optional(),
});

const AddProjectMemberSchema = z.object({
  userId: UUIDSchema,
  role: z.enum(['tl', 'trainee', 'member']),
});

const ChangeProjectHeadSchema = z.object({
  userId: UUIDSchema,
});

const CreateTaskSchema = z.object({
  title:         z.string().min(1, 'Task title is required'),
  description:   z.string().optional(),
  priority:      z.enum(Object.values(PRIORITY_LEVELS)),
  dueDate:       DateSchema,
  assignees:     z.array(UUIDSchema).min(1, 'At least one assignee is required'),
  projectId:     UUIDSchema,
  workspaceId:   UUIDSchema,
  projectHeadId: UUIDSchema,
  sprintId:      UUIDSchema.optional(),
  parentTask:    UUIDSchema.optional(),
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
});

const ApproveTaskSchema = z.object({
  comment: z.string().optional(),
});

const RejectTaskSchema = z.object({
  reason:   z.string().min(1, 'Rejection reason is required'),
  rejectTo: UUIDSchema, 
});

const HandoverSchema = z.object({
  notes: z.string().min(1, 'Handover notes are required'),
  handoverTo: UUIDSchema,
});

const CreateSprintSchema = z.object({
  name: z.string().min(1, 'Sprint name is required'),
  projectId: UUIDSchema,
  startDate: DateSchema,
  endDate: DateSchema,
  goal: z.string().optional(),
});

const UpdateSprintSchema = z.object({
  name: z.string().min(1).optional(),
  startDate: DateSchema.optional(),
  endDate: DateSchema.optional(),
  goal: z.string().optional(),
});

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

const GetProjectsQuerySchema = PaginationSchema.extend({
  workspaceId: UUIDSchema,
});

const GetMeetingsQuerySchema = PaginationSchema.extend({
  workspaceId: UUIDSchema,
  // from and to are required — callers must always specify a time window to
  // prevent unbounded meeting scans across the full workspace history.
  from:        z.string().datetime({ message: 'from must be a valid ISO datetime' }),
  to:          z.string().datetime({ message: 'to must be a valid ISO datetime' }),
}).refine((obj) => new Date(obj.to) >= new Date(obj.from), {
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
  ValidateQuery,
  parsePagination,
  PaginationSchema,
  GetTasksQuerySchema,
  GetSprintsQuerySchema,
  GetProjectsQuerySchema,
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
  UpdateTaskStatusSchema,
  ApproveTaskSchema,
  RejectTaskSchema,
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
