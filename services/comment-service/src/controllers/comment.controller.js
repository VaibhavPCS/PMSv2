const { CatchAsync } = require('@pms/error-handler');
const CommentService = require('../services/comment.service');
const { PublishCommentAdded, PublishCommentDeleted } = require('../events/publishers');

const _safePublish = (fn, ...args) => {
    // Event publishing must never fail the request — log and move on.
    Promise.resolve()
        .then(() => fn(...args))
        .catch((err) => console.error('[comment-service] event publish failed:', err.message));
};

const CreateComment = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const comment = await CommentService.CreateComment(userId, req.body);
    _safePublish(PublishCommentAdded, comment);
    res.status(201).json({ status: 'success', data: comment });
});

const GetComments = CatchAsync(async (req, res) => {
    const { entityType, entityId } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const parsedLimit = Number(req.query.limit);
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(100, parsedLimit)) : 20;
    const comments = await CommentService.GetComments(entityType, entityId, { page, limit });
    res.status(200).json({ status: 'success', data: comments });
});

const GetReplies = CatchAsync(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const parsedLimit = Number(req.query.limit);
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(100, parsedLimit)) : 20;
    const replies = await CommentService.GetReplies(req.params.id, { page, limit });
    res.status(200).json({ status: 'success', data: replies });
});

const GetCommentCount = CatchAsync(async (req, res) => {
    const { entityType, entityId } = req.query;
    const count = await CommentService.GetCommentCount(entityType, entityId);
    res.status(200).json({ status: 'success', data: { count } });
});

const EditComment = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const comment = await CommentService.EditComment(req.params.id, userId, req.body.content);
    res.status(200).json({ status: 'success', data: comment });
});

const DeleteComment = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const result = await CommentService.DeleteComment(req.params.id, userId);
    _safePublish(PublishCommentDeleted, result);
    res.status(200).json({ status: 'success', data: null });
});

const AddReaction = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await CommentService.AddReaction(req.params.id, userId, req.body.emoji);
    res.status(200).json({ status: 'success', data: null });
});

const RemoveReaction = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const emoji = req.body?.emoji || req.query?.emoji;
    await CommentService.RemoveReaction(req.params.id, userId, emoji);
    res.status(200).json({ status: 'success', data: null });
});

module.exports = {
    CreateComment,
    GetComments,
    GetReplies,
    GetCommentCount,
    EditComment,
    DeleteComment,
    AddReaction,
    RemoveReaction,
};
