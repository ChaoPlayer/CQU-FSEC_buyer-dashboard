#!/bin/bash

# 遇到错误立即退出
set -e

# ================= 配置区 =================
IMAGE_NAME="procurement-web"
NAS_IP="172.20.200.200"
NAS_USER="CQUFSAE" 
NAS_PATH="/volume1/docker"
NAS_PASS="CQUtest1"
# ==========================================

# 1. 检查参数：是否输入了版本号
if [ -z "$1" ]; then
  echo "❌ 错误: 请提供一个版本号！"
  exit 1
fi

VERSION=$1
TAR_NAME="${IMAGE_NAME}_v${VERSION}.tar"

echo "========================================"
echo "🚀 开始全自动部署 ${IMAGE_NAME} 到 NAS (版本: v${VERSION})"
echo "========================================"

# 2. 本地强制无缓存构建镜像（👈 修复点1：加入了 --no-cache 逼迫 Docker 重新下载 Prisma 引擎）
echo "🔨 [1/6] 正在本地构建 Docker 镜像 ${IMAGE_NAME}:v${VERSION} (无缓存模式，请耐心等待)..."
sudo docker build --no-cache -t ${IMAGE_NAME}:v${VERSION} .

# 3. 导出镜像包并修改权限
echo "📦 [2/6] 正在导出离线镜像包 ${TAR_NAME}..."
sudo docker save -o ${TAR_NAME} ${IMAGE_NAME}:v${VERSION}
sudo chown $USER:$USER ${TAR_NAME}

# 4. 修改本地 docker-compose.yml 中的 image 版本号（👈 修复点2：先夺回权限，防止产生 sed 垃圾文件）
echo "📝 [3/6] 正在自动更新 docker-compose.yml 中的版本标签..."
sudo chown $USER:$USER docker-compose.yml
sed -i.bak -E "s|image:[[:space:]]*${IMAGE_NAME}:.*|image: ${IMAGE_NAME}:v${VERSION}|g" docker-compose.yml
rm -f docker-compose.yml.bak

# 5. 推送文件到 NAS
echo "📤 [4/6] 正在推送 ${TAR_NAME} 和 docker-compose.yml 到 NAS (${NAS_IP})..."
scp ${TAR_NAME} docker-compose.yml ${NAS_USER}@${NAS_IP}:${NAS_PATH}/

# 6. 在 NAS 上执行部署命令
echo "⚙️ [5/6] 正在 NAS 上加载镜像并重启容器..."
ssh ${NAS_USER}@${NAS_IP} << EOF
  cd ${NAS_PATH}
  
  echo "=> 正在加载新镜像..."
  echo "${NAS_PASS}" | sudo -S docker load -i ${TAR_NAME}
  
  echo "=> 正在停止旧容器..."
  echo "${NAS_PASS}" | sudo -S docker-compose down
  
  echo "=> 正在启动新容器..."
  echo "${NAS_PASS}" | sudo -S docker-compose up -d
  
  echo "=> 正在清理 NAS 上的临时 tar 包..."
  rm -f ${TAR_NAME}
  exit
EOF

# 7. 清理本地包
echo "🧹 [6/6] 清理本地临时 tar 包..."
rm -f ${TAR_NAME}

echo "========================================"
echo "🎉 部署完成！NAS 上的容器现已运行 v${VERSION}。"
echo "========================================"

# 8. 数据库同步
read -p "❓ 是否需要在容器内强行执行数据库结构同步 (Prisma db push)? (y/n): " SYNC_DB
if [ "$SYNC_DB" = "y" ]; then
    echo "🔄 正在同步数据库..."
    ssh -t ${NAS_USER}@${NAS_IP} "echo '${NAS_PASS}' | sudo -S docker exec -it ${IMAGE_NAME} npx prisma db push --accept-data-loss"
    echo "✅ 数据库同步完成！"
fi