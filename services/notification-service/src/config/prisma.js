const { PrismaClient } = require('@prisma/client');

const createClient = () => new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

const prisma = global.__notificationPrisma || createClient();

if (process.env.NODE_ENV !== 'production') {
  global.__notificationPrisma = prisma;
}

module.exports = prisma;
