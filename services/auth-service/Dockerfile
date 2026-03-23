FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/ ./shared/
COPY services/auth-service/ ./services/auth-service/

RUN npm ci --workspace=@pms/auth-service --include-workspace-root

RUN npx prisma generate --schema=./services/auth-service/prisma/schema.prisma

WORKDIR /app/services/auth-service
EXPOSE 4001
CMD ["node", "index.js"]
