# Container image for the TanStack Start frontend (Nitro node-server preset).
# Node and pnpm match the local toolchain (Node 26, pnpm 12).

# ---- Build stage ----
FROM node:26-slim AS build
WORKDIR /workspace

# Node 26 no longer bundles corepack, so install pnpm directly
RUN npm install -g pnpm@12.16.1

# Install dependencies in their own layer so source edits don't re-download them
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ---- Runtime stage ----
# Nitro bundles everything the server needs into .output, so no node_modules here
FROM node:26-slim
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY --from=build --chown=node:node /workspace/.output ./.output

USER node

# Cloud Run injects PORT; Nitro's node-server reads it
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
