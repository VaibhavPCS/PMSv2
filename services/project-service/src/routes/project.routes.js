const Router = require('express').Router();
const { z } = require('zod');
const { AuthenticateToken } = require('@pms/auth-middleware');
const { ValidateRequest, CreateProjectSchema, UpdateProjectSchema, AddProjectMemberSchema, ChangeProjectHeadSchema } = require('@pms/validators');
const { CreateProject, GetProjects, GetProject, UpdateProject, DeleteProject } = require('../controllers/project.controller');
const { GetMembers, AddMember, RemoveMember, ChangeMemberRole, ChangeProjectHead } = require('../controllers/member.controller');

const ChangeRoleBodySchema = z.object({
  role: z.enum(['tl', 'trainee', 'member']),
}).strict();

Router.post('/', AuthenticateToken, ValidateRequest(CreateProjectSchema), CreateProject);
Router.get('/', AuthenticateToken, GetProjects);
Router.get('/:id', AuthenticateToken, GetProject);
Router.patch('/:id', AuthenticateToken, ValidateRequest(UpdateProjectSchema), UpdateProject);
Router.delete('/:id', AuthenticateToken, DeleteProject);
Router.get('/:id/members', AuthenticateToken, GetMembers);
Router.post('/:id/members', AuthenticateToken, ValidateRequest(AddProjectMemberSchema), AddMember);
Router.delete('/:id/members/:userId', AuthenticateToken, RemoveMember);
Router.patch('/:id/members/:userId/role', AuthenticateToken, ValidateRequest(ChangeRoleBodySchema), ChangeMemberRole);
Router.patch('/:id/project-head', AuthenticateToken, ValidateRequest(ChangeProjectHeadSchema), ChangeProjectHead);

module.exports = Router;