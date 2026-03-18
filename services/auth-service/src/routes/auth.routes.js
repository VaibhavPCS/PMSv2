const Router      = require('express').Router();
const { z }       = require('zod');

const { AuthenticateToken }       = require('@pms/auth-middleware');
const { ValidateRequest }         = require('@pms/validators');
const { GetMe, UpdateProfile }    = require('../controllers/auth.controller');

const UpdateProfileSchema = z.object({
  name:           z.string().min(2, 'Name must be at least 2 characters').optional(),
  profilePicture: z.url().optional(),
}).strict();


Router.get('/me',   AuthenticateToken,                                    GetMe);
Router.patch('/me', AuthenticateToken, ValidateRequest(UpdateProfileSchema), UpdateProfile);

module.exports = Router;
