jest.mock('supertokens-node', () => ({
  init: jest.fn(),
  middleware: () => (req, res, next) => next(),
  errorHandler: () => (err, req, res, next) => next(err),
  getAllCORSHeaders: () => [],
}));

jest.mock('@pms/auth-middleware', () => ({
  InitAuth: jest.fn(),
  AuthenticateToken: (req, res, next) => {
    req.session = { getUserId: () => 'st-user-123' };
    next();
  },
}));

jest.mock('../../services/auth.service');

jest.mock('@pms/validators', () => ({
  ValidateRequest: () => (req, res, next) => next(),
}));

const request = require('supertest');
const App = require('../../app');
const AuthService = require('../../services/auth.service');

const MOCK_USER = {
  id: 'st-user-123',
  name: 'Alice',
  email: 'alice@example.com',
  profilePicture: null,
  activeWorkspace: null,
  lastLogin: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GET /api/v1/auth/me', () => {
  it('returns 200 with the user profile', async () => {
    AuthService.GetUserById.mockResolvedValue(MOCK_USER);

    const res = await request(App).get('/api/v1/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toMatchObject({ id: 'st-user-123', email: 'alice@example.com' });
    expect(AuthService.GetUserById).toHaveBeenCalledWith('st-user-123');
  });

  it('returns 404 when the user does not exist in the DB', async () => {
    const { APIError } = jest.requireActual('@pms/error-handler');
    AuthService.GetUserById.mockRejectedValue(new APIError(404, 'User not found.'));

    const res = await request(App).get('/api/v1/auth/me');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('User not found.');
  });
});

describe('PATCH /api/v1/auth/me', () => {
  it('returns 200 with the updated profile', async () => {
    const updated = { ...MOCK_USER, name: 'Alice Updated' };
    AuthService.UpdateUser.mockResolvedValue(updated);

    const res = await request(App)
      .patch('/api/v1/auth/me')
      .send({ name: 'Alice Updated' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.name).toBe('Alice Updated');
    expect(AuthService.UpdateUser).toHaveBeenCalledWith('st-user-123', {
      name: 'Alice Updated',
      profilePicture: undefined,
    });
  });

  it('returns 500 when the service throws an unexpected error', async () => {
    AuthService.UpdateUser.mockRejectedValue(new Error('DB connection lost'));

    const res = await request(App)
      .patch('/api/v1/auth/me')
      .send({ name: 'Bob' });
    expect(res.status).toBe(500);
  });
});
