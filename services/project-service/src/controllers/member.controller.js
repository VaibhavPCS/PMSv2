const { CatchAsync }   = require('@pms/error-handler');
const MemberService    = require('../services/member.service');

const GetMembers = CatchAsync(async (req, res) => {
    const userId    = req.session.getUserId();
    const projectId = req.params.id;

    const members = await MemberService.GetMembers(projectId, userId);
    res.status(200).json(members);
});

const AddMember = CatchAsync(async (req, res) => {
    const userId    = req.session.getUserId();
    const projectId = req.params.id;
    const { userId: newUserId, role } = req.body;

    const member = await MemberService.AddMember(projectId, newUserId, role, userId);
    res.status(201).json(member);
});

const RemoveMember = CatchAsync(async (req, res) => {
    const userId    = req.session.getUserId();
    const projectId = req.params.id;
    const targetId  = req.params.userId;

    await MemberService.RemoveMember(projectId, targetId, userId);
    res.status(204).send();
});

const ChangeMemberRole = CatchAsync(async (req, res) => {
    const userId    = req.session.getUserId();
    const projectId = req.params.id;
    const targetId  = req.params.userId;
    const { role }  = req.body;

    await MemberService.ChangeMemberRole(projectId, targetId, role, userId);
    res.status(200).json({ message: 'Member role updated successfully' });
});

const ChangeProjectHead = CatchAsync(async (req, res) => {
    const userId       = req.session.getUserId();
    const projectId    = req.params.id;
    const { userId: newHeadId } = req.body;

    await MemberService.ChangeProjectHead(projectId, newHeadId, userId);
    res.status(200).json({ message: 'Project head changed successfully' });
});

module.exports = {
    GetMembers,
    AddMember,
    RemoveMember,
    ChangeMemberRole,
    ChangeProjectHead,
};
