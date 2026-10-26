FROM node:24-bookworm-slim AS build

WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.build.json ./
RUN pnpm install --frozen-lockfile
COPY src/ src/
RUN pnpm build
RUN pnpm prune --prod

FROM node:24-bookworm-slim

WORKDIR /app
LABEL org.opencontainers.image.source="https://github.com/ambrogio-app/ambrogio-satellite" \
      org.opencontainers.image.licenses="MIT"
RUN apt-get update && apt-get install -y --no-install-recommends libasound2 alsa-utils \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules/ node_modules/
COPY --from=build /app/dist/ dist/
COPY models/ models/
CMD ["node", "dist/main.js"]
