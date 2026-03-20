const crypto = require('crypto');
const { APIError, CatchAsync } = require('@pms/error-handler');
const { CreateLogger } = require('@pms/logger');
const prisma = require('../config/prisma');
const InstanceService = require('../services/instance.service');

const logger = CreateLogger('workflow-engine:github-webhook');

const TASK_ID_PATTERN = /PMS:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i;

const _verifySignature = (rawBody, signatureHeader) => {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
        throw new APIError(500, 'Webhook secret not configured');
    }

    if (!signatureHeader) {
        throw new APIError(401, 'Missing x-hub-signature-256 header.');
    }

    const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;

    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        throw new APIError(401, 'Invalid webhook signature.');
    }
};

const _extractTaskId = (pr) => {
    const searchText = `${pr.title || ''} ${pr.body || ''}`;
    const match = searchText.match(TASK_ID_PATTERN);
    return match ? match[1] : null;
};

const HandleGithubWebhook = CatchAsync(async (req, res) => {
    const githubEvent = req.headers['x-github-event'];
    const signature = req.headers['x-hub-signature-256'];

    _verifySignature(req.body, signature);

    const payload = JSON.parse(req.body.toString());

    if (githubEvent !== 'pull_request' || payload.action !== 'closed' || !payload.pull_request?.merged) {
        return res.status(200).json({ received: true, action: 'ignored' });
    }

    const taskId = _extractTaskId(payload.pull_request);
    if (!taskId) {
        logger.info('[GITHUB_WEBHOOK] No PMS task ID found in PR — ignoring');
        return res.status(200).json({ received: true, action: 'no_task_id' });
    }

    const instance = await prisma.workflowInstance.findUnique({
        where: { taskId },
        include: { definition: true },
    });

    if (!instance || instance.isTerminal) {
        logger.info(`[GITHUB_WEBHOOK] No active workflow instance for task ${taskId}`);
        return res.status(200).json({ received: true, action: 'no_active_instance' });
    }

    if (!instance.definition || !instance.definition.definition) {
        logger.error(`[GITHUB_WEBHOOK] Missing workflow definition payload for instance=${instance.id} task=${taskId}`);
        return res.status(500).json({ received: true, action: 'invalid_definition' });
    }

    const definition = instance.definition.definition;
    const transitions = Array.isArray(definition.transitions) ? definition.transitions : [];
    if (!Array.isArray(definition.transitions)) {
        logger.error(`[GITHUB_WEBHOOK] Invalid transitions payload for instance=${instance.id} task=${taskId}`);
    }

    const githubTransition = transitions.find(
        (t) => t.from === instance.currentStage && t.githubTrigger === true,
    );

    if (!githubTransition) {
        logger.info(`[GITHUB_WEBHOOK] No github transition from stage '${instance.currentStage}' for task ${taskId}`);
        return res.status(200).json({ received: true, action: 'no_github_transition' });
    }

    await InstanceService.TransitionStage(
        taskId,
        {
            toStage: githubTransition.to,
            note: `Auto-advanced via GitHub PR #${payload.pull_request.number}: "${payload.pull_request.title}"`,
            attachmentUrl: null,
            referenceLink: payload.pull_request.html_url,
        },
        'github-system',
        null,
        'github_webhook',
    );

    logger.info(
        `[GITHUB_WEBHOOK] Transitioned task=${taskId} ${instance.currentStage}→${githubTransition.to} via PR #${payload.pull_request.number}`,
    );

    res.status(200).json({
        received: true,
        action: 'transitioned',
        taskId,
        from: instance.currentStage,
        to: githubTransition.to,
    });
});

module.exports = { HandleGithubWebhook };