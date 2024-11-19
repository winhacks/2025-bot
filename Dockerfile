FROM node:20

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Dependency layer
COPY ./package.json package.json
COPY ./pnpm-lock.yaml pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Build layer
COPY ./tsconfig.json tsconfig.json
COPY ./src src
COPY ./prisma prisma
RUN pnpm build

# Config layer
COPY ./config.json5 config.json5

# Execution layer
CMD pnpm prisma:migrate && pnpm host
