const Router = require('express').Router();
const { z } = require('zod');
const { AuthenticateToken } = require('@pms/auth-middleware');
const { ValidateParams, UUIDSchema } = require('@pms/validators');
const { GetMyNotifications, GetUnreadCount, MarkAsRead, MarkAllAsRead } = require('../controllers/notification.controller');

const IdParamSchema = z.object({ id: UUIDSchema }).strict();

Router.get('/', AuthenticateToken, GetMyNotifications);
Router.get('/unread-count', AuthenticateToken, GetUnreadCount);
Router.patch('/read-all', AuthenticateToken, MarkAllAsRead);
Router.patch('/:id/read', AuthenticateToken, ValidateParams(IdParamSchema), MarkAsRead);
module.exports = Router;