FROM node:20

WORKDIR /app

# Dependency layer
COPY ./package.json package.json
COPY ./yarn.lock yarn.lock
RUN yarn install

# Build layer
COPY ./tsconfig.json tsconfig.json
COPY ./src src
COPY ./prisma prisma
RUN yarn build

# Config layer
COPY ./config.json5 config.json5

# Execution layer
CMD yarn prisma:migrate && yarn host
