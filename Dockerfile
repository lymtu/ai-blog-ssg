FROM oven/bun:1 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN bun install
COPY frontend/ ./
RUN bun run build

FROM oven/bun:1
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY src ./src
COPY templates ./templates
COPY content ./content
COPY --from=frontend-build /app/public ./public

RUN mkdir -p content/markdown public/data

EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
