#!/bin/bash

# 遇到错误立即退出
set -e

# ================= 配置区 =================
IMAGE_NAME="procurement-web"
NAS_IP="172.20.200.200"
NAS_USER="CQUFSAE" # 替换为你在 NAS 上的 SSH 用户名
NAS_PATH="/volume1/docker"
# ==========================================

# 1. 检查参数：是否输入了版本号
if [ -z "$1" ]; then
  echo "❌ 错误: 请提供一个版本号！"
  echo "💡 用法: ./deploy.sh <版本号> (例如: ./deploy.sh 1.3)"
  exit 1
fi

VERSION=$1
TAR_NAME="${IMAGE_NAME}_v${VERSION}.tar"

echo "========================================"
echo "🚀 开始全自动部署 ${IMAGE_NAME} 到 NAS (版本: v${VERSION})"
echo "========================================"

# 2. 本地构建镜像
echo "🔨 [1/6] 正在本地构建 Docker 镜像 ${IMAGE_NAME}:v${VERSION}..."
sudo docker build -t ${IMAGE_NAME}:v${VERSION} .

# 3. 导出镜像包并修改权限
echo "📦 [2/6] 正在导出离线镜像包 ${TAR_NAME}..."
sudo docker save -o ${TAR_NAME} ${IMAGE_NAME}:v${VERSION}
sudo chown $USER:$USER ${TAR_NAME}

# 4. 修改本地 docker-compose.yml 中的 image 版本号
echo "📝 [3/6] 正在自动更新 docker-compose.yml 中的版本标签..."
# 使用 sed 动态替换 image 后面的版本号
sed -i.bak -E "s|image:[[:space:]]*${IMAGE_NAME}:.*|image: ${IMAGE_NAME}:v${VERSION}|g" docker-compose.yml
rm -f docker-compose.yml.bak

# 5. 推送文件到 NAS
echo "📤 [4/6] 正在推送 ${TAR_NAME} 和 docker-compose.yml 到 NAS (${NAS_IP})..."
scp ${TAR_NAME} docker-compose.yml ${NAS_USER}@${NAS_IP}:${NAS_PATH}/

# 6. 在 NAS 上执行部署命令
echo "⚙️ [5/6] 正在 NAS 上加载镜像并重启容器..."
# 通过 SSH 连接到 NAS 并批量执行命令
ssh -t ${NAS_USER}@${NAS_IP} << EOF
  cd ${NAS_PATH}
  echo "=> 正在加载新镜像..."
  sudo docker load -i ${TAR_NAME}
  
  echo "=> 正在停止旧容器..."
  sudo docker-compose down
  
  echo "=> 正在启动新容器..."
  sudo docker-compose up -d
  
  echo "=> 正在清理 NAS 上的临时 tar 包..."
  rm -f ${TAR_NAME}
  exit
EOF

# 7. 可选：数据库结构同步
echo "🧹 [6/6] 清理本地临时 tar 包..."
rm -f ${TAR_NAME}

echo "========================================"
echo "🎉 部署完成！NAS 上的容器现已运行 v${VERSION}。"
echo "========================================"

# 交互式询问是否需要同步数据库
read -p "❓ 是否需要在容器内强行执行数据库结构同步 (Prisma db push)? (y/n): " SYNC_DB
if [ "$SYNC_DB" = "y" ]; then
    echo "🔄 正在同步数据库..."
    # 按照你的文档说明，在容器运行状态下强行执行同步命令
    ssh -t ${NAS_USER}@${NAS_IP} "sudo docker exec -it ${IMAGE_NAME} npx prisma db push --accept-data-loss"
    echo "✅ 数据库同步完成！"
fi