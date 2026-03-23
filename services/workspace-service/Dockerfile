FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/ ./shared/
COPY services/workspace-service/ ./services/workspace-service/

RUN npm ci --workspace=@pms/workspace-service --include-workspace-root

RUN npx prisma generate --schema=./services/workspace-service/prisma/schema.prisma

WORKDIR /app/services/workspace-service
EXPOSE 4002
CMD ["node", "index.js"]
