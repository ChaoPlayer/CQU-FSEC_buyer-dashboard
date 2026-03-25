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

# 1. 检查参数
if [ -z "$1" ]; then
  echo "❌ 错误: 请提供一个版本号！例如: ./deploy.sh 3.2"
  exit 1
fi
VERSION=$1

echo "========================================"
echo "    🚀 全能自动化运维控制台 (v${VERSION})"
echo "========================================"
echo "请选择您的操作："
echo "  [1] 💻 启动本地测试 (原生运行，不打包)"
echo "  [2] 🌍 部署到远端 NAS (打包并推送到 172.20.200.200)"
echo "  [3] 📥 同步生产数据库 (将 NAS 上的真实数据拉取到本地)"
echo "========================================"
read -p "请输入选项 [1、2 或 3]: " DEPLOY_MODE

# ================= 分支一：本地原生测试 =================
if [ "$DEPLOY_MODE" == "1" ]; then
    echo "🔧 正在切换到【本地测试环境】..."
    if [ -f ".env.local" ]; then
        cp .env.local .env
        echo "✅ 已自动应用 .env.local 配置"
    fi

    echo "🔄 正在同步本地数据库结构并生成 Prisma Client..."
    npx prisma db push
    npx prisma generate

    echo "========================================"
    echo "🎉 环境准备就绪！"
    echo "🌐 Web 访问: http://localhost:3000"
    echo "========================================"
    npm run dev

# ================= 分支二：远端 NAS 部署 =================
elif [ "$DEPLOY_MODE" == "2" ]; then
    echo "🌍 正在切换到【NAS 生产环境】..."
    if [ -f ".env.nas" ]; then
        cp .env.nas .env
        echo "✅ 已自动应用 .env.nas 配置"
    fi

    echo "🔨 [1/6] 正在本地构建 Docker 镜像 ${IMAGE_NAME}:v${VERSION} (无缓存)..."
    sudo docker build --no-cache -t ${IMAGE_NAME}:v${VERSION} .

    echo "📝 [2/6] 更新 docker-compose.yml 版本..."
    sudo chown $USER:$USER docker-compose.yml
    sed -i.bak -E "s|image:[[:space:]]*${IMAGE_NAME}:.*|image: ${IMAGE_NAME}:v${VERSION}|g" docker-compose.yml
    rm -f docker-compose.yml.bak

    TAR_NAME="${IMAGE_NAME}_v${VERSION}.tar"

    echo "📦 [3/6] 正在导出离线镜像包 ${TAR_NAME}..."
    sudo docker save -o ${TAR_NAME} ${IMAGE_NAME}:v${VERSION}
    sudo chown $USER:$USER ${TAR_NAME}

    echo "📤 [4/6] 正在推送文件到 NAS..."
    scp ${TAR_NAME} docker-compose.yml ${NAS_USER}@${NAS_IP}:${NAS_PATH}/

    echo "⚙️ [5/6] 正在 NAS 上重启容器..."
    ssh ${NAS_USER}@${NAS_IP} << EOF
      cd ${NAS_PATH}
      echo "${NAS_PASS}" | sudo -S docker load -i ${TAR_NAME}
      echo "${NAS_PASS}" | sudo -S docker-compose down
      echo "${NAS_PASS}" | sudo -S docker-compose up -d
      rm -f ${TAR_NAME}
      exit
EOF

    echo "🧹 [6/6] 清理本地临时包..."
    rm -f ${TAR_NAME}
    echo "🎉 NAS 部署完成！"

# ================= 分支三：同步生产数据库到本地 =================
elif [ "$DEPLOY_MODE" == "3" ]; then
    echo "📥 正在准备从 NAS 拉取生产数据库..."
    
    # 1. 备份本地旧数据库（防呆设计）
    if [ -f "prisma/dev.db" ]; then
        echo "📦 正在备份本地旧数据库到 prisma/dev.db.bak ..."
        cp prisma/dev.db prisma/dev.db.bak
    fi

    # 2. 从 NAS 下载数据库文件
    echo "🌐 正在通过 SSH 下载真实数据文件..."
    # 使用 scp 将远端映射目录里的 dev.db 拉到本地 prisma 目录下
    scp ${NAS_USER}@${NAS_IP}:${NAS_PATH}/prisma/dev.db ./prisma/dev.db

    echo "========================================"
    echo "🎉 数据库同步完成！"
    echo "💡 你的本地环境现在拥有了和 NAS 上一模一样的所有用户、工时和打卡记录！"
    echo "👉 提示：你可以立刻运行选项 [1] 启动本地服务进行测试。"
    echo "========================================"

else
    echo "❌ 错误: 无效的选择，脚本已退出。"
    exit 1
fi