const Router = require('express').Router();
const { AuthenticateToken } = require('@pms/auth-middleware');
const { GetMyNotifications, GetUnreadCount, MarkAsRead, MarkAllAsRead } = require('../controllers/notification.controller');
Router.get('/', AuthenticateToken, GetMyNotifications);
Router.get('/unread-count', AuthenticateToken, GetUnreadCount);
Router.patch('/read-all', AuthenticateToken, MarkAllAsRead);
Router.patch('/:id/read', AuthenticateToken, MarkAsRead);
module.exports = Router;