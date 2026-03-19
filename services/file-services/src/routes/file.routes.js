const Router = require('express').Router();
const { AuthenticateToken } = require('@pms/auth-middleware');
const { Middleware, ErrorHandler } = require('../middleware/multer');
const { UploadFile, GetFileUrl, ListFiles, DeleteFile } = require('../controller/file.controller');

Router.post(  '/',        AuthenticateToken, Middleware.Single('file'), ErrorHandler.MulterError, UploadFile);
Router.get(   '/',        AuthenticateToken, ListFiles);
Router.get(   '/:id/url', AuthenticateToken, GetFileUrl);
Router.delete('/:id',     AuthenticateToken, DeleteFile);

module.exports = Router;
