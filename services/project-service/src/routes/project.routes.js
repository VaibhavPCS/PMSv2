const Router = require('express').Router();
const { z } = require('zod');
const { AuthenticateToken } = require('@pms/auth-middleware');
const { ValidateRequest, ValidateQuery, GetProjectsQuerySchema, RecentProjectsQuerySchema, CreateProjectSchema, UpdateProjectSchema, AddProjectMemberSchema, ChangeProjectHeadSchema, ExtendProjectDeadlineSchema } = require('@pms/validators');
const { CreateProject, GetProjects, GetRecentProjects, GetProject, UpdateProject, DeleteProject, ExtendProjectDeadline } = require('../controllers/project.controller');
const { GetMembers, AddMember, RemoveMember, ChangeMemberRole, ChangeProjectHead } = require('../controllers/member.controller');

const ChangeRoleBodySchema = z.object({
  role: z.enum(['tl', 'trainee', 'member']),
  reportsTo: z.string().uuid('Invalid ID format').optional(),
}).strict();

Router.post('/', AuthenticateToken, ValidateRequest(CreateProjectSchema), CreateProject);
Router.get('/', AuthenticateToken, ValidateQuery(GetProjectsQuerySchema), GetProjects);
// MUST stay above GET '/:id' so Express does not match "recent" as an :id param.
Router.get('/recent', AuthenticateToken, ValidateQuery(RecentProjectsQuerySchema), GetRecentProjects);
Router.get('/:id', AuthenticateToken, GetProject);
Router.patch('/:id', AuthenticateToken, ValidateRequest(UpdateProjectSchema), UpdateProject);
Router.delete('/:id', AuthenticateToken, DeleteProject);
Router.get('/:id/members', AuthenticateToken, GetMembers);
Router.post('/:id/members', AuthenticateToken, ValidateRequest(AddProjectMemberSchema), AddMember);
Router.delete('/:id/members/:userId', AuthenticateToken, RemoveMember);
Router.patch('/:id/members/:userId/role', AuthenticateToken, ValidateRequest(ChangeRoleBodySchema), ChangeMemberRole);
Router.patch('/:id/project-head', AuthenticateToken, ValidateRequest(ChangeProjectHeadSchema), ChangeProjectHead);
Router.patch('/:id/extend-deadline', AuthenticateToken, ValidateRequest(ExtendProjectDeadlineSchema), ExtendProjectDeadline);

module.exports = Router;