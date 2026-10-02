FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/* && useradd -r -u 1001 app
COPY --from=build --chown=app /app ./
USER app
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
