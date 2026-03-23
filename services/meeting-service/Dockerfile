FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/ ./shared/
COPY services/meeting-service/ ./services/meeting-service/

RUN npm ci --workspace=@pms/meeting-service --include-workspace-root

RUN npx prisma generate --schema=./services/meeting-service/prisma/schema.prisma

WORKDIR /app/services/meeting-service
EXPOSE 4009
CMD ["node", "index.js"]
