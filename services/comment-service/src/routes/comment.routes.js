const Router = require('express').Router();
const { z } = require('zod');
const { AuthenticateToken } = require('@pms/auth-middleware');
const { ValidateRequest, ValidateQuery } = require('@pms/validators');
const { MAX_FILES_PER_UPLOAD } = require('@pms/constants');
const {
    CreateComment, GetComments, GetReplies, GetCommentCount,
    EditComment, DeleteComment, AddReaction, RemoveReaction,
} = require('../controllers/comment.controller');

// The set of entities a comment may attach to. Reject anything else.
const COMMENT_ENTITY_TYPES = ['task', 'project', 'sprint', 'workspace'];
const EntityTypeSchema = z.enum(COMMENT_ENTITY_TYPES);

const CreateCommentSchema = z.object({
    workspaceId: z.string().uuid(),
    entityType:  EntityTypeSchema,
    entityId:    z.string().uuid(),
    content:     z.string().trim().min(1, 'Comment content is required').max(10000),
    parentId:    z.string().uuid().optional(),
    attachments: z.array(z.string().uuid()).max(MAX_FILES_PER_UPLOAD).optional(),
}).strict();

const EditCommentSchema = z.object({ content: z.string().trim().min(1, 'Comment content is required').max(10000) }).strict();
const ReactionSchema     = z.object({ emoji: z.string().min(1).max(16) }).strict();

const EntityQuerySchema = z.object({
    entityType: EntityTypeSchema,
    entityId:   z.string().uuid(),
    page:       z.coerce.number().int().min(1).optional(),
    limit:      z.coerce.number().int().min(1).max(100).optional(),
});

Router.post('/',            AuthenticateToken, ValidateRequest(CreateCommentSchema), CreateComment);
Router.get('/',             AuthenticateToken, ValidateQuery(EntityQuerySchema), GetComments);
Router.get('/count',        AuthenticateToken, ValidateQuery(EntityQuerySchema.pick({ entityType: true, entityId: true })), GetCommentCount);
Router.get('/:id/replies',  AuthenticateToken, GetReplies);
Router.patch('/:id',        AuthenticateToken, ValidateRequest(EditCommentSchema), EditComment);
Router.delete('/:id',       AuthenticateToken, DeleteComment);
Router.post('/:id/reactions',   AuthenticateToken, ValidateRequest(ReactionSchema), AddReaction);
Router.delete('/:id/reactions', AuthenticateToken, ValidateRequest(ReactionSchema), RemoveReaction);

module.exports = Router;
