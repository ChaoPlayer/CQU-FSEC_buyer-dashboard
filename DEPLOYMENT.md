# 采购报销管理系统 - 详细部署与启动说明书

本文档提供从零开始部署和运行采购报销管理系统的完整步骤，涵盖开发环境、生产环境以及常见问题排查。

## 系统要求

- Node.js 20 或更高版本
- npm 10+ 或 yarn 1.x
- SQLite（开发环境）或 PostgreSQL（生产环境）
- Git（可选）

## 一、获取代码

### 方案A：使用已创建的项目（当前目录）
如果您已在 `/home/chao/trail/procurement-web` 目录中，可直接进入该目录：

```bash
cd /home/chao/trail/procurement-web
```

### 方案B：从零开始（新环境）
1. 将项目复制到新位置（例如 `/opt/procurement`）：
   ```bash
   cp -r /home/chao/trail/procurement-web /opt/procurement
   cd /opt/procurement
   ```

2. 或者从 Git 仓库克隆（若已上传）：
   ```bash
   git clone <repository-url>
   cd procurement-web
   ```

## 二、环境配置

### 1. 安装 Node.js（如未安装）
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

### 2. 安装项目依赖
```bash
npm install
```

### 3. 配置环境变量
复制环境变量模板并编辑：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，设置以下值：

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

**生成 NEXTAUTH_SECRET**（推荐）：
```bash
openssl rand -base64 32
```

### 4. 数据库初始化
```bash
npx prisma db push
```

此命令将根据 `prisma/schema.prisma` 创建 SQLite 数据库文件 `dev.db`。

## 三、启动服务

### 开发模式（热重载，适合调试）
```bash
npm run dev
```
访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 生产模式（构建后运行）
1. 构建项目：
   ```bash
   npm run build
   ```
2. 启动生产服务器：
   ```bash
   npm start
   ```
   默认端口 3000。

### 使用 PM2 守护进程（生产环境）
安装 PM2：
```bash
npm install -g pm2
```

启动应用：
```bash
pm2 start npm --name "procurement-web" -- start
```

查看状态：
```bash
pm2 status
```

## 四、首次使用与测试

### 1. 创建用户
1. 访问 `http://localhost:3000/register` 注册一个普通用户。
2. 注册后自动跳转至登录页，使用刚注册的账号登录。

### 2. 测试普通用户功能
- **仪表盘**：登录后进入 `/dashboard`，查看统计卡片和采购列表（初始为空）。
- **提交采购**：点击“提交新采购”，填写表单并上传图片/PDF，提交后返回仪表盘查看记录。
- **查看状态**：采购状态默认为“待审核”，可在仪表盘看到状态标签。

### 3. 设置管理员账号
默认注册的角色为 `USER`，需要手动提升为 `ADMIN`。

**方法一：使用 Prisma Studio（推荐）**
```bash
npx prisma studio
```
访问 `http://localhost:5555`，在 `User` 表中找到对应用户，将 `role` 字段改为 `ADMIN`。

**方法二：通过 SQL 直接更新**
```bash
sqlite3 dev.db "UPDATE User SET role = 'ADMIN' WHERE email = 'admin@example.com';"
```

**方法三：使用临时脚本**
创建 `promote-admin.js`：
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.user.update({
    where: { email: 'admin@example.com' },
    data: { role: 'ADMIN' },
  });
  console.log('User promoted to ADMIN');
}
main();
```
运行：
```bash
node promote-admin.js
```

### 4. 测试管理员功能
1. 退出当前用户，用管理员账号重新登录。
2. 导航栏将显示“管理员面板”和“统计”菜单。
3. 进入管理员面板 (`/admin`)，查看所有用户的采购记录。
4. 对采购进行“批准/拒绝”操作，下载 PDF 发票（自动按采购信息命名）。

## 五、文件存储配置

### 默认配置（开发环境）
上传的文件保存在 `public/uploads/` 目录，可通过 `http://localhost:3000/uploads/{文件名}` 直接访问。

### 生产环境建议
推荐使用云存储（如 AWS S3、Cloudinary）以提高可靠性和扩展性。

**示例：AWS S3 集成**
1. 安装依赖：
   ```bash
   npm install @aws-sdk/client-s3
   ```
2. 修改 `app/api/upload/route.ts`，将本地存储逻辑替换为 S3 上传。
3. 设置环境变量：
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   S3_BUCKET=your-bucket
   ```

## 六、部署到 Vercel（推荐）

### 准备工作
1. 将代码推送到 GitHub/GitLab 仓库。
2. 注册 [Vercel](https://vercel.com) 并登录。

### 部署步骤
1. 在 Vercel 控制台点击 **Add New Project**。
2. 导入你的 Git 仓库。
3. 配置环境变量（同 `.env.local`）。
4. 点击 **Deploy**。

### 注意事项
- Vercel 不支持持久化文件存储，上传功能需使用云存储。
- SQLite 在 Vercel 上无法持久化，请使用 PostgreSQL（通过 Vercel Postgres 或外部数据库）。

## 七、部署到 Docker

### 1. 创建 Dockerfile
在项目根目录创建 `Dockerfile`：
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/.env.production ./.env.local
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "start"]
```

### 2. 创建 docker-compose.yml
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://postgres:password@db:5432/procurement"
      NEXTAUTH_SECRET: "your-secret"
      NEXTAUTH_URL: "http://localhost:3000"
    depends_on:
      - db
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: procurement
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
```

### 3. 构建并运行
```bash
docker-compose up -d
```

## 八、故障排除

### 1. 启动时出现 “React Context is unavailable in Server Components”
- 原因：NextAuth 配置与 Next.js 15 不完全兼容。
- 解决方案：确保 `lib/auth.ts` 中 `session.strategy` 设置为 `"jwt" as const`，并检查布局中是否正确使用了 `SessionProvider`。

### 2. 数据库连接错误
- 检查 `DATABASE_URL` 环境变量是否正确。
- 确保数据库服务正在运行（如 PostgreSQL）。
- 运行 `npx prisma generate` 重新生成客户端。

### 3. 文件上传失败
- 检查 `public/uploads` 目录是否存在并有写入权限。
- 检查文件大小限制（默认 10MB）和文件类型限制。

### 4. 身份验证失败
- 确认 `NEXTAUTH_SECRET` 已设置且足够复杂。
- 检查用户密码是否正确哈希（注册时使用 bcrypt）。

### 5. 管理员面板无法访问
- 确认用户角色为 `ADMIN`（区分大小写）。
- 检查会话是否已更新（可能需要重新登录）。

## 九、维护与升级

### 更新依赖
```bash
npm update
```

### 数据库迁移（如修改 schema）
1. 编辑 `prisma/schema.prisma`。
2. 生成迁移：
   ```bash
   npx prisma migrate dev --name add_new_field
   ```
3. 应用迁移：
   ```bash
   npx prisma migrate deploy
   ```

### 备份数据库
SQLite：
```bash
cp dev.db dev.db.backup
```

PostgreSQL：
```bash
pg_dump procurement > backup.sql
```

## 十、联系方式与支持

- **项目文档**：参阅 [`README.md`](README.md) 和 [`plans/procurement_website_plan.md`](plans/procurement_website_plan.md)。
- **问题反馈**：通过 Issue 跟踪或联系开发团队。

---

**祝您部署顺利！** 如有其他问题，请参考官方文档或寻求社区帮助。