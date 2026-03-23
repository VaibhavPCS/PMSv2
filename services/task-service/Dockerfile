FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/ ./shared/
COPY services/task-service/ ./services/task-service/

RUN npm ci --workspace=@pms/task-service --include-workspace-root

RUN npx prisma generate --schema=./services/task-service/prisma/schema.prisma

WORKDIR /app/services/task-service
EXPOSE 4004
CMD ["node", "index.js"]
