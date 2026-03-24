# ==================== 第一阶段：依赖安装 ====================
FROM node:22-alpine AS deps

# 1. 绝杀校园网拦截：强行把 https 替换为 http，绕过 TLS 证书校验！
RUN sed -i 's/https/http/g' /etc/apk/repositories && \
    apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma

# 2. 同样关闭 npm 的严格证书校验，使用淘宝源保证本地不报错
RUN npm config set registry http://registry.npmmirror.com/ && \
    npm config set strict-ssl false && \
    npm ci 

# 3. 生成 Prisma 客户端
RUN npx prisma@6.19.2 generate


# ==================== 第二阶段：项目构建 ====================
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY --from=deps /app/prisma ./prisma
COPY . .

# 构建 Next.js 应用
RUN npm run build


# ==================== 第三阶段：离线生产环境 ====================
FROM node:22-alpine AS runner
WORKDIR /app

# 4. 再次绕过 TLS，并安装包含 C++ 运行库在内的所有终极底层依赖！
RUN sed -i 's/https/http/g' /etc/apk/repositories && \
    apk add --no-cache openssl openssl-dev libc6-compat libgcc libstdc++

# 设置生产环境变量
ENV NODE_ENV=production

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 5. 复制正常的业务代码
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# 👇👇👇 6. 终极大招：既然大一点没关系，我们直接把带满血引擎的整个依赖库搬过来！
# （删掉原来那两行 COPY prisma，换成下面这一行）
COPY --from=deps /app/node_modules ./node_modules

# 设置用户和权限
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
EXPOSE 5555

# 启动命令
CMD ["node", "server.js"]
