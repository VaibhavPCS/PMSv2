const { PrismaClient } = require('../../generated/prisma-client');

const createClient = () => new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

const prisma = global.__analyticsPrisma || createClient();

if (process.env.NODE_ENV !== 'production') {
  global.__analyticsPrisma = prisma;
}

module.exports = prisma;
