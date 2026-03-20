const Router = require('express').Router();
const crypto = require('crypto');
const { APIError } = require('@pms/error-handler');
const { HandleGithubWebhook } = require('../controllers/github.controller');

const verifyGithubSignature = (req, _res, next) => {
	const secret = process.env.GITHUB_WEBHOOK_SECRET;
	if (!secret) {
		return next(new APIError(500, 'Webhook secret not configured'));
	}

	const signatureHeader = req.headers['x-hub-signature-256'];
	if (!signatureHeader || typeof signatureHeader !== 'string') {
		return next(new APIError(401, 'Missing x-hub-signature-256 header.'));
	}

	if (!Buffer.isBuffer(req.rawBody)) {
		return next(new APIError(401, 'Missing raw webhook payload for signature verification.'));
	}

	const expected = `sha256=${crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex')}`;
	const a = Buffer.from(expected);
	const b = Buffer.from(signatureHeader);
	if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
		return next(new APIError(401, 'Invalid webhook signature.'));
	}

	next();
};

Router.post('/github', (req, _res, next) => {
	req.rawBody = Buffer.isBuffer(req.body) ? req.body : null;
	next();
}, verifyGithubSignature, HandleGithubWebhook);

module.exports = Router;