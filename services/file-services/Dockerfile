FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/ ./shared/
COPY services/file-services/ ./services/file-services/

RUN npm ci --workspace=@pms/file-service --include-workspace-root

RUN npx prisma generate --schema=./services/file-services/prisma/schema.prisma

WORKDIR /app/services/file-services
EXPOSE 4008
CMD ["node", "index.js"]
