FROM node:18-alpine AS builder

WORKDIR /app

RUN addgroup -g 1001 brimble-paas && \
    adduser -S brimble-paas -u 1001 -G brimble-paas

COPY package.json package-lock.json ./

RUN npm ci

COPY src ./src
COPY tsconfig.json ./

RUN npx tsc

RUN cp -r src/infra/migrations dist/infra/migrations

FROM node:18-alpine

WORKDIR /app

RUN addgroup -g 1001 brimble-paas && \
    adduser -S brimble-paas -u 1001 -G brimble-paas

RUN apk add --no-cache curl git docker-cli docker-cli-buildx

RUN curl -fsSL \
    "https://github.com/railwayapp/railpack/releases/download/v0.23.0/railpack-v0.23.0-x86_64-unknown-linux-musl.tar.gz" \
    -o /tmp/railpack.tar.gz && \
    tar -xzf /tmp/railpack.tar.gz -C /usr/local/bin && \
    chmod +x /usr/local/bin/railpack && \
    rm /tmp/railpack.tar.gz && \
    railpack --version

# Pre-download mise at exact version and path railpack expects
RUN mkdir -p /tmp/railpack/mise && \
    curl -fsSL \
    "https://github.com/jdx/mise/releases/download/v2026.3.17/mise-v2026.3.17-linux-x64-musl" \
    -o "/tmp/railpack/mise/mise-2026.3.17" && \
    chmod +x "/tmp/railpack/mise/mise-2026.3.17" && \
    chown -R brimble-paas:brimble-paas /tmp/railpack

COPY package.json package-lock.json ./

RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/workspaces/uploads && \
    chown -R brimble-paas:brimble-paas /app/workspaces

RUN addgroup -S docker || true && \
    adduser brimble-paas docker || true

USER brimble-paas

EXPOSE 3000
EXPOSE 9464

CMD ["node", "dist/server.js"]