FROM node:24-bookworm-slim AS build

WORKDIR /app
RUN npm install --global pnpm@12.11.2
ENV ONNXRUNTIME_NODE_INSTALL=skip
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.build.json ./
COPY scripts/patch-micdrop.mjs scripts/patch-micdrop.mjs
RUN pnpm install --frozen-lockfile
COPY src/ src/
RUN pnpm build
RUN pnpm prune --prod

FROM node:24-bookworm-slim

WORKDIR /app
LABEL org.opencontainers.image.source="https://github.com/adrianofoschi/ambrogio-satellite"
RUN apt-get update && apt-get install -y --no-install-recommends libasound2 libgomp1 \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules/ node_modules/
COPY --from=build /app/dist/ dist/
COPY models/ models/
COPY assets/ assets/
CMD ["node", "dist/main.js", "--config", "/config/satellite.json"]
