FROM node:20-slim

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY medmentoringatual/package.json medmentoringatual/pnpm-lock.yaml ./
COPY medmentoringatual/patches/ ./patches/
RUN pnpm install --no-frozen-lockfile

# Force fresh copy every build by including all source files
COPY medmentoringatual/shared/ ./shared/
COPY medmentoringatual/client/ ./client/
COPY medmentoringatual/server/ ./server/
COPY medmentoringatual/drizzle/ ./drizzle/
COPY medmentoringatual/drizzle.config.ts ./
COPY medmentoringatual/tsconfig.json ./
COPY medmentoringatual/vite.config.ts ./
COPY medmentoringatual/attached_assets/ ./attached_assets/

ENV VITE_GOOGLE_CLIENT_ID=287693490427-2oij2b8m6o146nd73epllv5ncpru0m2d.apps.googleusercontent.com

RUN pnpm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "npx drizzle-kit push --force 2>&1; NODE_ENV=production node dist/index.js"]
