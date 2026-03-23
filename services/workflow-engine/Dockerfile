FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/ ./shared/
COPY services/workflow-engine/ ./services/workflow-engine/

RUN npm ci --workspace=@pms/workflow-engine --include-workspace-root

RUN npx prisma generate --schema=./services/workflow-engine/prisma/schema.prisma

WORKDIR /app/services/workflow-engine
EXPOSE 4006
CMD ["node", "index.js"]
