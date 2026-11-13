FROM node:20-bookworm-slim AS builder
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY backend/package.json ./
RUN npm install

COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY prisma ./prisma

ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/creative_partner?schema=public"
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y openssl ffmpeg fonts-dejavu-core python3 python3-venv \
  && python3 -m venv /opt/tts \
  && /opt/tts/bin/pip install --no-cache-dir edge-tts \
  && rm -rf /var/lib/apt/lists/* /root/.cache
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY frontend/public/images ./public/images
RUN mkdir -p /app/storage

EXPOSE 3000
CMD ["node", "dist/index.js"]
