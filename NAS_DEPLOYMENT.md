# 采购报销管理系统 NAS 部署指南

本文档详细说明如何在支持 Docker 的 NAS 设备（如群晖 Synology DSM、QNAP QTS、威联通等）上部署采购报销管理系统。NAS 通常提供图形化的 Docker 管理界面，同时也支持通过 SSH 命令行操作，本指南将涵盖两种方式。

## 一、NAS 环境要求

在开始部署前，请确保您的 NAS 满足以下条件：

1. **Docker 支持**：NAS 操作系统已安装 Docker 套件（如 Synology DSM 的 Docker 包、QNAP Container Station 等）。
2. **docker-compose 支持**（可选但推荐）：部分 NAS 的 Docker 套件可能不包含 docker-compose，您可以通过 SSH 安装。
3. **硬件资源**：
   - 至少 1 GB 空闲内存
   - 至少 2 GB 存储空间（用于镜像和数据库）
   - 支持 x86_64 或 ARM64 架构（本项目使用多架构兼容的 Node 20 Alpine 镜像）
4. **网络**：NAS 能够访问互联网以下载 Docker 镜像。

## 二、准备工作

### 2.1 获取项目文件

您需要将项目文件上传到 NAS 的某个目录中。以下是几种常见方式：

- **通过 SMB/AFP 文件共享**：在电脑上访问 NAS 共享文件夹，将整个 `procurement-web` 目录复制过去。
- **通过 SSH/SCP**：使用 scp 命令将项目文件上传到 NAS：
  ```bash
  scp -r procurement-web/ user@nas_ip:/volume1/docker/procurement-web/
  ```
- **通过 Git**（如果 NAS 支持 Git 套件）：在 NAS 上直接克隆仓库。

假设最终项目路径为：`/volume1/docker/procurement-web`（Synology 常见路径）或 `/share/CACHEDEV1_DATA/Container/procurement-web`（QNAP 常见路径）。

### 2.2 检查 Docker 环境

登录 NAS 管理界面，打开 Docker 套件（如 Synology 的“Docker”应用），确保 Docker 服务正在运行。如果尚未安装，请从套件中心安装 Docker。

### 2.3 （可选）启用 SSH 访问

对于高级操作，建议启用 NAS 的 SSH 服务，以便使用命令行工具。在 NAS 控制面板中找到“终端机和 SNMP”或“SSH 服务”，启用 SSH 并设置端口。

通过 SSH 登录 NAS：
```bash
ssh admin@nas_ip -p 22
```

## 三、配置环境变量

项目使用环境变量文件 `.env` 来配置数据库和认证密钥。在项目根目录下创建或修改该文件。

### 3.1 复制环境变量模板

在项目根目录执行（通过 SSH 或文件管理器）：
```bash
cd /volume1/docker/procurement-web
cp .env.example .env
```

### 3.2 编辑 .env 文件

使用文本编辑器（如 vi、nano 或 NAS 的文本编辑器）打开 `.env`，设置以下关键变量：

```env
# 数据库连接（使用 SQLite，文件将存储在持久化卷中）
DATABASE_URL="file:./prisma/dev.db"

# NextAuth 密钥（必须更改！）
# 生成一个随机字符串，例如通过 openssl rand -base64 32
NEXTAUTH_SECRET="your-strong-secret-key-here"

# 应用访问地址（根据您的网络设置）
# 如果通过 NAS 的 IP 和端口访问，例如 http://192.168.1.100:3000
NEXTAUTH_URL="http://nas_ip:3000"

# 可选：上传文件存储路径（容器内路径，已通过卷映射到宿主机）
UPLOAD_DIR="/app/public/uploads"
```

**注意**：`nas_ip` 应替换为您的 NAS 实际 IP 地址。如果使用反向代理或域名，请相应调整 `NEXTAUTH_URL`。

## 四、使用 docker-compose 部署（推荐）

如果您的 NAS 支持 docker-compose，这是最简单的部署方式。

### 4.1 检查 docker-compose 是否安装

通过 SSH 登录 NAS，运行：
```bash
docker-compose --version
```
如果未安装，可以手动安装（以 Synology 为例）：
```bash
# 下载 docker-compose（选择与架构匹配的版本）
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 4.2 启动服务

在项目根目录执行：
```bash
cd /volume1/docker/procurement-web
docker-compose up -d
```

这将执行以下操作：
- 基于 `Dockerfile` 构建镜像（首次构建可能需要几分钟）
- 创建并启动名为 `procurement-web` 的容器
- 将容器端口 3000 映射到宿主机（NAS）的 3000 端口
- 挂载数据卷 `./prisma_data` 到容器内的 `/app/prisma`，确保 SQLite 数据库文件持久化
- 自动重启策略设置为 `always`

### 4.3 查看日志

检查容器是否正常运行：
```bash
docker-compose logs -f
```

如果看到 `"Ready on http://localhost:3000"` 或类似消息，表示启动成功。

## 五、使用 NAS Docker 图形界面部署

如果您的 NAS Docker 套件不支持 docker-compose，可以通过图形界面手动创建容器。

### 5.1 构建镜像

1. 打开 Docker 套件，切换到“镜像”选项卡。
2. 点击“添加” -> “从 Dockerfile 构建”。
3. 选择项目路径（`/volume1/docker/procurement-web`）。
4. 镜像名称填写 `procurement-web:latest`。
5. 点击“构建”，等待完成。

### 5.2 创建容器

1. 在“镜像”列表中找到 `procurement-web:latest`，点击“启动”。
2. 容器名称：`procurement-web`。
3. **端口设置**：
   - 本地端口：3000（或您希望的外部端口）
   - 容器端口：3000
4. **存储卷设置**（关键步骤）：
   - 添加文件夹挂载：
     - 文件/文件夹：选择 NAS 上的一个目录，例如 `/volume1/docker/procurement-web/prisma_data`
     - 挂载路径：`/app/prisma`
   - 可选：如果需要持久化上传的文件，可以再添加一个卷将 `./public/uploads` 挂载到 `/app/public/uploads`。
5. **环境变量**：点击“高级设置” -> “环境”，添加以下变量（或导入 `.env` 文件）：
   - `DATABASE_URL=file:./prisma/dev.db`
   - `NEXTAUTH_SECRET=your-strong-secret-key`
   - `NEXTAUTH_URL=http://nas_ip:3000`
6. **重启策略**：设置为“始终重启”。
7. 点击“应用”并启动容器。

## 六、数据持久化说明

为了保证数据安全，必须正确配置持久化卷：

### 6.1 SQLite 数据库文件

在 `docker-compose.yml` 中，我们已将 `./prisma_data` 挂载到容器的 `/app/prisma` 目录。这意味着数据库文件 `dev.db` 实际上存储在 NAS 的 `./prisma_data` 目录中。

**重要**：如果未挂载此目录，每次容器重建或更新时，数据库将被重置，所有用户数据丢失。

### 6.2 上传的文件

系统支持用户上传文件（如图片、PDF），默认存储在容器内的 `/app/public/uploads`。如果您希望这些文件持久化，可以添加额外的卷映射：

在 `docker-compose.yml` 中添加：
```yaml
volumes:
  - ./prisma_data:/app/prisma
  - ./uploads:/app/public/uploads
```

或者通过图形界面添加第二个卷。

### 6.3 备份建议

定期备份 NAS 上的以下目录：
- `./prisma_data`（包含 SQLite 数据库）
- `./uploads`（如果配置了持久化）

您可以使用 NAS 内置的备份工具（如 Synology Hyper Backup）将这些目录备份到外部存储或云存储。

## 七、访问应用

容器启动后，您可以通过以下方式访问应用：

1. **直接通过 IP 和端口**：在浏览器中输入 `http://nas_ip:3000`（将 `nas_ip` 替换为您的 NAS IP 地址）。
2. **通过反向代理**（推荐）：如果您希望使用域名和 HTTPS，可以配置 NAS 的反向代理（如 Synology 的“应用程序门户”或使用 Nginx Proxy Manager）。将流量代理到 `localhost:3000`。
3. **通过 QuickConnect 或 DDNS**：如果您的 NAS 启用了 QuickConnect（群晖）或 DDNS，可以使用相应的域名访问。

## 八、初始设置

首次访问应用时，请完成以下步骤：

1. **注册管理员账户**：访问 `http://nas_ip:3000/register` 注册第一个账户。
2. **提升为管理员**：默认注册的用户角色为 `USER`。您需要将其提升为 `ADMIN`：
   - 通过 SSH 进入容器：`docker exec -it procurement-web sh`
   - 执行 Prisma Studio：`npx prisma studio`（访问端口 5555，需要额外端口映射）
   - 或者直接修改数据库文件：SQLite 数据库位于挂载的 `./prisma_data/dev.db`，您可以使用 SQLite 命令行工具修改 `User` 表的 `role` 字段为 `ADMIN`。
3. **登录管理员账户**：使用管理员账户登录，即可访问管理员面板 (`/admin`) 和所有功能。

## 九、维护与更新

### 9.1 查看容器状态

```bash
docker-compose ps
```

### 9.2 停止和启动服务

```bash
docker-compose stop   # 停止
docker-compose start  # 启动
docker-compose restart # 重启
```

### 9.3 更新应用

当项目代码更新时，需要重新构建镜像：

```bash
# 进入项目目录
cd /volume1/docker/procurement-web

# 拉取最新代码（如果使用 Git）
git pull origin main

# 重新构建并启动
docker-compose build --no-cache
docker-compose up -d
```

**注意**：由于数据库文件已持久化，更新不会丢失数据。

### 9.4 清理旧镜像

定期清理无用的镜像以节省空间：
```bash
docker image prune -a
```

## 十、故障排除

### 10.1 容器启动失败

检查容器日志：
```bash
docker-compose logs procurement-web
```

常见问题：
- **端口冲突**：如果端口 3000 已被占用，修改 `docker-compose.yml` 中的端口映射，例如 `"8080:3000"`。
- **权限错误**：确保挂载的目录（如 `./prisma_data`）对 Docker 进程可写。可以在 NAS 上修改目录权限：
  ```bash
  chmod 777 ./prisma_data
  ```
- **环境变量缺失**：检查 `.env` 文件是否存在且格式正确。

### 10.2 数据库连接错误

如果应用启动但无法连接数据库：
- 确认 `DATABASE_URL` 指向正确的路径（容器内路径为 `file:./prisma/dev.db`）。
- 检查挂载的 `./prisma_data` 目录中是否存在 `dev.db` 文件。如果不存在，容器启动时会自动创建，但需要确保目录可写。
- 可以手动初始化数据库（在容器内执行）：
  ```bash
  docker exec procurement-web npx prisma db push
  ```

### 10.3 上传文件失败

如果用户上传文件时出错：
- 检查是否配置了上传目录的持久化卷。
- 确保容器内的 `/app/public/uploads` 目录存在且可写。
- 查看应用日志中是否有权限错误。

### 10.4 无法访问应用

- 确认容器正在运行：`docker-compose ps`
- 确认端口映射正确：`docker port procurement-web`
- 检查 NAS 防火墙是否允许该端口。
- 尝试从 NAS 本地访问：`curl http://localhost:3000`（通过 SSH 执行）。

## 十一、安全建议

1. **使用强密码**：为管理员账户设置复杂密码。
2. **启用 HTTPS**：通过反向代理配置 SSL 证书（如 Let's Encrypt），避免敏感信息明文传输。
3. **限制访问**：如果应用仅在内部使用，可以通过 NAS 防火墙限制访问 IP 范围。
4. **定期更新**：关注项目更新，及时修复安全漏洞。
5. **备份数据**：定期备份数据库和上传的文件。

## 十二、联系方式

如果在部署过程中遇到问题，请参考项目其他文档：

- [`DEPLOYMENT.md`](DEPLOYMENT.md)：通用部署说明
- [`部署说明文档.md`](../部署说明文档.md)：中文详细部署指南
- `README.md`：项目简介

您也可以在项目仓库中提交 Issue 或联系开发团队。

---

**祝您部署顺利！** 本指南基于标准 NAS Docker 环境编写，具体操作可能因 NAS 型号和系统版本略有差异。请根据实际情况调整。