# 使用 Node 22 Alpine 作为基础镜像
FROM node:22-alpine AS deps

# 安装必要的构建工具（包括 openssl 等）
RUN apk add --no-cache openssl

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package.json package-lock.json ./

# 复制 prisma 目录
COPY prisma ./prisma

# 安装依赖（包括 devDependencies，因为需要 prisma 生成客户端）
RUN npm ci 

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建阶段
FROM node:22-alpine AS builder

WORKDIR /app

# 复制依赖阶段生成的文件
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY --from=deps /app/prisma ./prisma

# 复制源代码
COPY . .

# 构建 Next.js 应用（standalone 输出已配置在 next.config.ts）
RUN npm run build

# 运行阶段
FROM node:22-alpine AS runner

WORKDIR /app

# 设置生产环境变量
ENV NODE_ENV=production

# 安装 openssl（Prisma 可能需要）
RUN apk add --no-cache openssl

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制 public 静态文件
COPY --from=builder /app/public ./public

# 复制 Next.js standalone 输出
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 复制 Prisma 相关文件（用于数据库迁移或 SQLite 文件）
COPY --from=builder /app/prisma ./prisma

RUN npm config set registry https://registry.npmmirror.com/ && npm install -g prisma
# 设置用户和权限
RUN chown -R nextjs:nodejs /app
USER nextjs

# 暴露端口
EXPOSE 3000
EXPOSE 5555

# 启动命令
CMD ["node", "server.js"]
