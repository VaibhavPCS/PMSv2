FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/ ./shared/
COPY services/comms-service/ ./services/comms-service/

RUN npm ci --workspace=@pms/comms-service --include-workspace-root

RUN npx prisma generate --schema=./services/comms-service/prisma/schema.prisma

WORKDIR /app/services/comms-service
EXPOSE 4007
CMD ["node", "index.js"]
