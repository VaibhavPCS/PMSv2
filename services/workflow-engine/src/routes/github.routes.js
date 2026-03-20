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

	const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
	const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
	const a = Buffer.from(expected);
	const b = Buffer.from(signatureHeader);
	if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
		return next(new APIError(401, 'Invalid webhook signature.'));
	}

	next();
};

Router.post('/github', verifyGithubSignature, HandleGithubWebhook);

module.exports = Router;