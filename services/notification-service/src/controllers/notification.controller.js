const { CatchAsync } = require('@pms/error-handler');
const prisma = require('../config/prisma');

const GetMyNotifications = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const page = Math.max(1, Number(req.query.page) || 1);
    const parsedLimit = Number(req.query.limit);
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(50, parsedLimit)) : 20;
    const skip = (page - 1) * limit;

    const [notifications, total] = await prisma.$transaction([
        prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.notification.count({ where: { userId } }),
    ]);

    res.status(200).json({
        status: 'success',
        data: { notifications, total, page, limit },
    });
});

const GetUnreadCount = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const count = await prisma.notification.count({ where: { userId, isRead: false } });
    res.status(200).json({ status: 'success', data: { count } });
});

const MarkAsRead = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await prisma.notification.updateMany({
        where: { id: req.params.id, userId },
        data: { isRead: true },
    });
    res.status(200).json({ status: 'success', data: null });
});

const MarkAllAsRead = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
    });
    res.status(200).json({ status: 'success', data: null });
});

module.exports = { GetMyNotifications, GetUnreadCount, MarkAsRead, MarkAllAsRead };