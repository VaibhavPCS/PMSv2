const { CatchAsync }  = require('@pms/error-handler');
const AuthService     = require('../services/auth.service');

const GetMe = CatchAsync(async (req, res) => {
  const userId = req.session.getUserId();
  const user   = await AuthService.GetUserById(userId);
  res.status(200).json({ status: 'success', data: user });
});

const UpdateProfile = CatchAsync(async (req, res) => {
  const userId = req.session.getUserId();
  const { name, profilePicture } = req.body;

  const user = await AuthService.UpdateUser(userId, { name, profilePicture });
  res.status(200).json({ status: 'success', data: user });
});

module.exports = { GetMe, UpdateProfile };
