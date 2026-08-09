FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scripts/install-git-hooks.sh ./scripts/install-git-hooks.sh
RUN corepack enable && corepack prepare pnpm@10 --activate && pnpm install --frozen-lockfile
COPY . .
# 容器内：standalone 输出 + 根 basePath（让浏览器同源 REST 命中 BFF）。
ENV NEXT_STANDALONE=1
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# CourtOS is a Chinese-first interface. Alpine images do not ship CJK fonts,
# which makes the production UI render tofu boxes unless the host provides them.
RUN apk add --no-cache font-noto-cjk fontconfig
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
# JIQUN_API_URL 运行时由 compose 注入(standalone server 运行时读 process.env)
CMD ["node", "server.js"]
