# 采购报销管理系统

基于 Next.js 15 的全栈采购报销管理平台，支持用户提交采购信息、上传发票，管理员审核和统计。

## 功能特性

### 用户角色

#### 一般用户
- 注册/登录（凭证认证）
- 提交采购信息（物品名称、金额、链接、图片、PDF 发票、备注）
- 查看已提交的采购记录及统计（总额、状态）
- 修改或撤回待审核的采购

#### 管理员
- 查看所有用户的采购记录
- 审核采购（批准/拒绝）
- 下载 PDF 发票（自动按采购信息命名）
- 查看全局统计（总金额、用户数、待审核数量）
- 管理用户权限（未来扩展）

### 进度树与赛季结算系统

本系统为团队项目管理提供了 Git 风格的版本控制与赛季结算工作流。

#### 核心功能

- **进度树（Progress Tree）**：每个项目（如设计图纸、代码库）可创建独立的进度树，支持版本化文件管理。
- **Git 式版本控制**：版本分为主干版本（MAIN）和分支版本（BRANCH），状态包括待审核（PENDING）、已合并（MERGED）、已驳回（REJECTED）。
- **基于角色的审批流程**：
  - 普通用户（USER）只能提交分支版本，由所属组的组长（GROUP_LEADER）审批。
  - 组长可以提交主干版本，也可审批本组内的分支。
  - 管理员（ADMIN）拥有全部权限，可查看所有组的进度树。
- **文件存储按组隔离**：上传的文件按组别存放，自动清理旧版本，容量上限可配置。
- **可视化时间轴**：
  - 垂直时间轴（详情页）显示完整版本历史。
  - 水平时间轴（列表页卡片）以 Git 网络图风格展示主干与待处理分支，支持悬停查看详情。
- **赛季结算（Season Settlement）**：
  - 管理员可启动赛季结算，锁定全站提交，进入“组长确认”和“完成”阶段。
  - 支持上传结算文件（如工资表、汇总清单），记录操作日志。

#### 相关页面

- `/dashboard/progress‑trees` – 进度树列表（按组筛选）
- `/dashboard/progress‑trees/[id]` – 进度树详情与垂直时间轴
- `/admin/season‑settlement` – 赛季结算管理面板

#### 数据库模型

- `ProgressTree` – 进度树（关联组、创建者、状态）
- `TreeVersion` – 版本（类型、状态、提交者、文件、版本号）
- `SeasonSettlement` – 赛季结算（状态、文件、操作者）

### 技术栈

- **前端**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes (一体化)
- **数据库**: Prisma ORM + SQLite (开发) / PostgreSQL (生产)
- **认证**: NextAuth.js (Credentials Provider)
- **文件上传**: 本地存储（开发环境），可扩展至云存储
- **部署**: 支持 Vercel、Docker 等

## 快速开始

### 环境要求

- Node.js 20+
- npm 或 yarn
- SQLite (默认) 或 PostgreSQL

### 安装步骤

1. 克隆仓库并进入项目目录：

```bash
cd procurement-web
```

2. 安装依赖：

```bash
npm install
```

3. 设置环境变量：

复制 `.env.example` 到 `.env.local`：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，设置以下变量：

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

生成 NEXTAUTH_SECRET：

```bash
openssl rand -base64 32
```

4. 初始化数据库：

```bash
npx prisma db push
```

5. 启动开发服务器：

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)。

### 创建管理员账号

默认注册的用户角色为 `USER`。要将用户升级为管理员，可以通过数据库直接更新：

```sql
UPDATE User SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

或使用 Prisma Studio：

```bash
npx prisma studio
```

## 项目结构

```
procurement-web/
├── app/                    # Next.js 页面和 API 路由
│   ├── (auth)/            # 认证相关页面（登录、注册）
│   ├── api/               # API 端点
│   ├── dashboard/         # 用户仪表盘
│   ├── admin/             # 管理员面板
│   └── purchases/         # 采购相关页面
├── components/            # 可复用 React 组件
├── lib/                   # 工具函数、Prisma 客户端、NextAuth 配置
├── prisma/                # 数据库 schema 和迁移
├── public/                # 静态文件
└── types/                 # TypeScript 类型定义
```

## 部署

### Vercel（推荐）

1. 将代码推送到 GitHub/GitLab。
2. 在 Vercel 中导入项目。
3. 设置环境变量（同上）。
4. 部署自动构建。

### Docker

提供 `Dockerfile` 和 `docker-compose.yml`（待完善）。

## 配置说明

### 文件上传

默认使用本地磁盘存储上传文件（`public/uploads`）。生产环境建议使用云存储（如 AWS S3、Cloudinary），修改 `/app/api/upload/route.ts` 即可。

### 数据库

开发使用 SQLite，生产建议切换为 PostgreSQL。修改 `prisma/schema.prisma` 中的 `datasource` 并设置 `DATABASE_URL` 环境变量。

### 身份认证

目前仅支持邮箱/密码认证。可扩展 Google、GitHub OAuth（参考 NextAuth 文档）。

## 开发指南

### 添加新功能

1. 在 `prisma/schema.prisma` 中定义数据模型。
2. 运行 `npx prisma generate` 更新客户端。
3. 创建 API 路由（`app/api/...`）。
4. 创建页面（`app/.../page.tsx`）。
5. 创建相关组件（`components/...`）。

### 代码规范

- 使用 TypeScript 严格模式。
- 组件采用函数式组件和 React Hooks。
- 样式使用 Tailwind CSS 实用类。
- API 响应遵循 RESTful 约定。

## 常见问题

### 1. 构建失败，提示类型错误

运行 `npm run type-check` 检查 TypeScript 错误，确保所有类型正确导入。

### 2. 上传文件大小限制

默认限制为 10MB，可在 `/app/api/upload/route.ts` 中调整 `maxSize` 变量。

### 3. 管理员权限无法访问管理员面板

确保用户角色的 `role` 字段值为 `ADMIN`（区分大小写）。

### 4. 数据库连接错误

检查 `DATABASE_URL` 环境变量是否正确，并确保数据库服务正在运行。

## 许可证

MIT

## 联系方式

项目由 Roo 开发。如有问题，请提交 Issue 或联系维护者。
