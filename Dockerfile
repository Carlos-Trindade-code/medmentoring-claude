FROM node:20-slim

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY medmentoringatual/package.json medmentoringatual/pnpm-lock.yaml ./
COPY medmentoringatual/patches/ ./patches/
RUN pnpm install --no-frozen-lockfile

# Cache bust: change this value to force rebuild
ARG CACHEBUST=2026-04-13-v2
COPY medmentoringatual/ .

# Vite needs VITE_* vars at build time. Client ID is public (not a secret).
ENV VITE_GOOGLE_CLIENT_ID=287693490427-2oij2b8m6o146nd73epllv5ncpru0m2d.apps.googleusercontent.com

RUN pnpm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "echo 'Running migrations...' && npx drizzle-kit push --force 2>&1 && echo 'Migrations done. Starting server...' && node dist/index.js"]
