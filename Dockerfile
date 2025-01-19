FROM node:23-alpine

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

# Install wait-for script to delay execution until PostgreSQL is ready
ADD https://raw.githubusercontent.com/eficode/wait-for/v2.2.3/wait-for /usr/local/bin/wait-for
RUN chmod +x /usr/local/bin/wait-for

# Execution layer
CMD wait-for postgres:5432 -- pnpm prisma:migrate deploy && pnpm host
