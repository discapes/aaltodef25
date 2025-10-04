# docker build -f infra/Dockerfile -t sveltekit-app .
FROM node:20-alpine AS builder
WORKDIR /app
COPY trak/package.json trak/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY trak/ .    
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/src/lib/server/db/schema.ts ./src/lib/server/db/schema.ts
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
EXPOSE 3000
CMD sh -c "npx drizzle-kit migrate && node build"
