FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/ ./shared/
COPY services/notification-service/ ./services/notification-service/

RUN npm ci --workspace=@pms/notification-service --include-workspace-root

RUN npx prisma generate --schema=./services/notification-service/prisma/schema.prisma

WORKDIR /app/services/notification-service
EXPOSE 4005
CMD ["node", "index.js"]
