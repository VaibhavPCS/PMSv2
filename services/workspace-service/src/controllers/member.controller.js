const { CatchAsync }   = require('@pms/error-handler');
const MemberService    = require('../services/member.service');
const InviteService    = require('../services/invite.service');

const GetMembers = CatchAsync(async (req, res) => {
  const requesterId = req.session.getUserId();
  const members     = await MemberService.GetMembers(req.params.id, requesterId);
  res.status(200).json({ status: 'success', data: members });
});

const RemoveMember = CatchAsync(async (req, res) => {
  const requesterId = req.session.getUserId();
  await MemberService.RemoveMember(req.params.id, req.params.userId, requesterId);
  res.status(204).send();
});

const ChangeMemberRole = CatchAsync(async (req, res) => {
  const requesterId = req.session.getUserId();
  const member      = await MemberService.ChangeMemberRole(
    req.params.id,
    req.params.userId,
    req.body.role,
    requesterId
  );
  res.status(200).json({ status: 'success', data: member });
});

const InviteMember = CatchAsync(async (req, res) => {
  const requesterId     = req.session.getUserId();
  const { email, role } = req.body;
  const invite          = await InviteService.CreateInvite(req.params.id, email, role, requesterId);
  res.status(201).json({ status: 'success', data: { id: invite.id, email, role, expiresAt: invite.expiresAt } });
});

const AcceptInvite = CatchAsync(async (req, res) => {
  const userId = req.session.getUserId();
  await InviteService.AcceptInvite(req.body.token, userId);
  res.status(200).json({ status: 'success', message: 'Invite accepted.' });
});

const RevokeInvite = CatchAsync(async (req, res) => {
  const requesterId = req.session.getUserId();
  const { email }   = req.body;
  await InviteService.RevokeInvite(req.params.id, email, requesterId);
  res.status(204).send();
});

module.exports = {
  GetMembers,
  RemoveMember,
  ChangeMemberRole,
  InviteMember,
  AcceptInvite,
  RevokeInvite,
};
