FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/ ./shared/
COPY services/project-service/ ./services/project-service/

RUN npm ci --workspace=@pms/project-service --include-workspace-root

RUN npx prisma generate --schema=./services/project-service/prisma/schema.prisma

WORKDIR /app/services/project-service
EXPOSE 4003
CMD ["node", "index.js"]
