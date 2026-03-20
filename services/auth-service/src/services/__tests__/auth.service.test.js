// Prevent real Kafka connections from keeping the process alive after tests
jest.mock('../../events/publishers', () => ({
  PublishUserRegistered: jest.fn().mockResolvedValue(undefined),
  PublishUserUpdated:    jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../config/prisma', () => ({
  user: {
    create:     jest.fn(),
    findUnique: jest.fn(),
    update:     jest.fn(),
  },
}));

const prisma      = require('../../config/prisma');
const AuthService = require('../auth.service');

const MOCK_USER = {
  id:              'st-user-123',
  name:            'Alice',
  email:           'alice@example.com',
  profilePicture:  null,
  activeWorkspace: null,
  lastLogin:       null,
  isActive:        true,
  createdAt:       new Date('2026-01-01'),
  updatedAt:       new Date('2026-01-01'),
};

describe('AuthService.CreateUser', () => {
  it('creates a user row with the SuperTokens id as PK', async () => {
    prisma.user.create.mockResolvedValue(MOCK_USER);

    const result = await AuthService.CreateUser('st-user-123', 'Alice', 'alice@example.com');

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { id: 'st-user-123', name: 'Alice', email: 'alice@example.com' },
    });
    expect(result).toEqual(MOCK_USER);
  });

  it('propagates a Prisma P2002 (duplicate email) error', async () => {
    const dupError = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    prisma.user.create.mockRejectedValue(dupError);

    await expect(
      AuthService.CreateUser('st-user-456', 'Bob', 'alice@example.com')
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});

describe('AuthService.GetUserById', () => {
  it('returns the user when found', async () => {
    prisma.user.findUnique.mockResolvedValue(MOCK_USER);

    const result = await AuthService.GetUserById('st-user-123');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'st-user-123' } });
    expect(result).toEqual(MOCK_USER);
  });

  it('throws APIError 404 when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(AuthService.GetUserById('ghost-id')).rejects.toMatchObject({
      statusCode: 404,
      message:    'User not found.',
    });
  });
});

describe('AuthService.UpdateUser', () => {
  it('updates only fields that are provided', async () => {
    const updated = { ...MOCK_USER, name: 'Alice Updated' };
    prisma.user.update.mockResolvedValue(updated);

    const result = await AuthService.UpdateUser('st-user-123', { name: 'Alice Updated' });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'st-user-123' },
      data:  { name: 'Alice Updated' },
    });
    expect(result.name).toBe('Alice Updated');
  });

  it('does not include undefined fields in the update payload', async () => {
    prisma.user.update.mockResolvedValue(MOCK_USER);

    await AuthService.UpdateUser('st-user-123', { profilePicture: undefined });

    const callData = prisma.user.update.mock.calls[0][0].data;
    expect(callData).not.toHaveProperty('profilePicture');
    expect(callData).not.toHaveProperty('name');
  });

  it('can update both name and profilePicture together', async () => {
    const updated = { ...MOCK_USER, name: 'Bob', profilePicture: 'https://example.com/pic.jpg' };
    prisma.user.update.mockResolvedValue(updated);

    await AuthService.UpdateUser('st-user-123', {
      name:           'Bob',
      profilePicture: 'https://example.com/pic.jpg',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'st-user-123' },
      data:  { name: 'Bob', profilePicture: 'https://example.com/pic.jpg' },
    });
  });
});

describe('AuthService.SetLastLogin', () => {
  it('updates lastLogin to now', async () => {
    prisma.user.update.mockResolvedValue({ ...MOCK_USER, lastLogin: new Date() });

    await AuthService.SetLastLogin('st-user-123');

    const call = prisma.user.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'st-user-123' });
    expect(call.data.lastLogin).toBeInstanceOf(Date);
  });
});

describe('AuthService.SetActiveWorkspace', () => {
  it('updates activeWorkspace for the user', async () => {
    const ws = 'workspace-abc';
    prisma.user.update.mockResolvedValue({ ...MOCK_USER, activeWorkspace: ws });

    await AuthService.SetActiveWorkspace('st-user-123', ws);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'st-user-123' },
      data:  { activeWorkspace: ws },
    });
  });
});
