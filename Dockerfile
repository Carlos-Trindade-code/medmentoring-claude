FROM node:20-slim

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY medmentoringatual/package.json medmentoringatual/pnpm-lock.yaml ./
COPY medmentoringatual/patches/ ./patches/
RUN pnpm install --no-frozen-lockfile

COPY medmentoringatual/ .

ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN pnpm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/index.js"]
