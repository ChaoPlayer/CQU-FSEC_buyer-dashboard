#!/bin/bash

# 遇到错误立即退出
set -e

# ================= 配置区 =================
IMAGE_NAME="procurement-web"
CONTAINER_NAME="procurement-web"
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
echo "  [2] 🌍 完整部署到 NAS (构建镜像+推送+重启，容器自动迁移数据库)"
echo "  [3] 📥 同步生产数据库 (将 NAS 上的真实数据拉取到本地)"
echo "  [4] 💾 备份 NAS 生产数据库 (带时间戳存档，不影响线上环境)"
echo "  [5] 🗄️  紧急迁移 NAS 数据库 (手动触发迁移，用于修复缺表等问题)"
echo "========================================"
echo ""
echo "💡 热更新说明（每次改完代码如何发布）："
echo "   → 只改了代码 / 无数据库变动：直接选 [2]"
echo "   → 新增/修改了表字段：直接选 [2]（无需手动迁移）"
echo "   → 当前 Dockerfile 已配置：容器每次启动自动执行 prisma db push（安全幂等，保留数据）"
echo "========================================"
read -p "请输入选项 [1-5]: " DEPLOY_MODE

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

# ================= 分支二：完整部署到远端 NAS =================
elif [ "$DEPLOY_MODE" == "2" ]; then
    echo "🌍 正在切换到【NAS 生产环境】..."
    if [ -f ".env.nas" ]; then
        cp .env.nas .env
        echo "✅ 已自动应用 .env.nas 配置"
    fi

    echo "🔨 [1/6] 正在本地构建 Docker 镜像 ${IMAGE_NAME}:v${VERSION} (无缓存)..."
    sudo docker build --no-cache -t ${IMAGE_NAME}:v${VERSION} .

    echo "📝 [2/6] 更新 docker-compose.yml 版本号为 v${VERSION}..."
    sudo chown $USER:$USER docker-compose.yml
    sed -i.bak -E "s|image:[[:space:]]*${IMAGE_NAME}:.*|image: ${IMAGE_NAME}:v${VERSION}|g" docker-compose.yml
    rm -f docker-compose.yml.bak

    TAR_NAME="${IMAGE_NAME}_v${VERSION}.tar"

    echo "📦 [3/6] 正在导出离线镜像包 ${TAR_NAME}..."
    sudo docker save -o ${TAR_NAME} ${IMAGE_NAME}:v${VERSION}
    sudo chown $USER:$USER ${TAR_NAME}

    echo "📤 [4/6] 正在准备推送文件到 NAS..."
    echo ""
    echo "  请选择上传方式："
    echo "  [a] 🚀 全速上传（不限速，上传快但会影响上网）"
    echo "  [b] 🐢 限速上传（约 1.5MB/s，上传较慢但可正常上网）"
    read -p "  请输入 [a/b]: " UPLOAD_MODE

    if [ "$UPLOAD_MODE" == "b" ]; then
        # scp -l 单位是 Kbit/s，12288 Kbit/s ≈ 1.5 MB/s
        SCP_LIMIT=12288
        echo "  🐢 限速模式：大 tar 包限速 ~1.5MB/s 上传，请耐心等待..."
        scp -l ${SCP_LIMIT} ${TAR_NAME} ${NAS_USER}@${NAS_IP}:${NAS_PATH}/
    else
        echo "  🚀 全速模式：大 tar 包不限速上传..."
        scp ${TAR_NAME} ${NAS_USER}@${NAS_IP}:${NAS_PATH}/
    fi
    # 配置文件体积很小，直接全速传输
    scp docker-compose.yml ${NAS_USER}@${NAS_IP}:${NAS_PATH}/
    # 同步 prisma schema 和 migrations，确保 NAS 端有最新迁移文件（容器启动时需要读取）
    scp prisma/schema.prisma ${NAS_USER}@${NAS_IP}:${NAS_PATH}/prisma/schema.prisma
    scp -r prisma/migrations ${NAS_USER}@${NAS_IP}:${NAS_PATH}/prisma/

    echo "⚙️  [5/6] 正在 NAS 上加载镜像并重启容器..."
    echo ""
    echo "📢 提示：新镜像的启动命令包含 'prisma migrate deploy'，"
    echo "         容器启动时将自动应用所有待执行的数据库迁移。"
    echo ""
    ssh ${NAS_USER}@${NAS_IP} << EOF
      cd ${NAS_PATH}
      mkdir -p uploads
      echo "${NAS_PASS}" | sudo -S docker load -i ${TAR_NAME}
      echo "${NAS_PASS}" | sudo -S docker-compose down
      echo "${NAS_PASS}" | sudo -S docker-compose up -d
      rm -f ${TAR_NAME}

      echo ""
      echo "⏳ 等待容器启动中（15秒）..."
      sleep 15

      echo ""
      echo "📋 ===== 容器启动日志（确认迁移和服务是否正常）====="
      echo "${NAS_PASS}" | sudo -S docker logs --tail 40 ${CONTAINER_NAME} 2>&1
      echo "======================================================"
      exit
EOF

    echo ""
    echo "🧹 [6/6] 清理本地临时包..."
    rm -f ${TAR_NAME}

    echo ""
    echo "========================================"
    echo "🎉 NAS 部署完成！"
    echo "💡 如果上方日志中出现 '✓ Ready'，说明服务已正常启动（含数据库迁移）。"
    echo "💡 如迁移失败，请先运行选项 [4] 备份，再运行选项 [5] 手动修复数据库。"
    echo "========================================"

# ================= 分支三：同步生产数据库到本地 =================
elif [ "$DEPLOY_MODE" == "3" ]; then
    echo "📥 正在准备从 NAS 拉取生产数据库..."
    
    # 备份本地旧数据库（防呆设计）
    if [ -f "prisma/dev.db" ]; then
        echo "📦 正在备份本地旧数据库到 prisma/dev.db.bak ..."
        cp prisma/dev.db prisma/dev.db.bak
    fi

    echo "🌐 正在通过 SCP 下载真实数据文件..."
    scp ${NAS_USER}@${NAS_IP}:${NAS_PATH}/prisma/dev.db ./prisma/dev.db

    echo "========================================"
    echo "🎉 数据库同步完成！"
    echo "💡 你的本地环境现在拥有了和 NAS 上一模一样的所有用户、工时和打卡记录！"
    echo "👉 提示：可立刻运行选项 [1] 启动本地服务进行测试。"
    echo "========================================"

# ================= 分支四：备份 NAS 生产数据库 =================
elif [ "$DEPLOY_MODE" == "4" ]; then
    echo "💾 正在准备备份 NAS 生产数据库..."

    BACKUP_DIR="prisma/backups"
    mkdir -p ${BACKUP_DIR}

    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="${BACKUP_DIR}/nas_backup_${TIMESTAMP}.db"

    echo "🌐 正在从 NAS 下载数据库文件..."
    scp ${NAS_USER}@${NAS_IP}:${NAS_PATH}/prisma/dev.db ${BACKUP_FILE}

    if [ -f "${BACKUP_FILE}" ]; then
        FILE_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
        echo "========================================"
        echo "✅ 备份成功！"
        echo "📁 备份文件: ${BACKUP_FILE}"
        echo "📊 文件大小: ${FILE_SIZE}"
        echo "🕐 备份时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo ""
        echo "📋 当前所有备份文件："
        ls -lh ${BACKUP_DIR}/*.db 2>/dev/null | awk '{print "   " $9 "  (" $5 ")"}'
        echo "========================================"
        echo "💡 提示：备份文件仅保存在本地，不影响 NAS 生产数据库。"
        echo "💡 如需恢复，可手动将备份文件 SCP 到 NAS 替换 ${NAS_PATH}/prisma/dev.db"
    else
        echo "❌ 备份失败！请检查 NAS 连接是否正常。"
        exit 1
    fi

# ================= 分支五：紧急同步 NAS 数据库结构 =================
elif [ "$DEPLOY_MODE" == "5" ]; then
    echo "🗄️  正在准备对 NAS 数据库执行紧急结构同步..."
    echo ""
    echo "📌 此操作适用于以下场景："
    echo "   ① 容器已运行，但数据库缺少新表（如 SeasonSettlement / ProgressTree 等）"
    echo "   ② 需要手动同步最新的 schema.prisma 到数据库"
    echo ""
    echo "✅ 使用 prisma db push：只创建缺失的表/字段，完全保留现有数据"
    echo "⚠️  建议先用 [4] 备份数据库！"
    echo ""
    read -p "确认继续？[y/N]: " CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        echo "已取消。"
        exit 0
    fi

    echo "🔗 正在连接 NAS 执行数据库结构同步..."
    ssh ${NAS_USER}@${NAS_IP} << EOF
      cd ${NAS_PATH}

      echo "🔍 检测容器 ${CONTAINER_NAME} 是否运行中..."
      RUNNING=\$(echo "${NAS_PASS}" | sudo -S docker inspect --format='{{.State.Running}}' ${CONTAINER_NAME} 2>/dev/null || echo "false")

      if [ "\$RUNNING" != "true" ]; then
        echo "❌ 容器 ${CONTAINER_NAME} 未运行，请先启动容器后再执行此操作。"
        exit 1
      fi

      echo "✅ 容器运行正常"
      echo ""
      echo "🚀 正在同步数据库结构（保留所有现有数据）..."
      echo "${NAS_PASS}" | sudo -S docker exec ${CONTAINER_NAME} sh -c \
        "npx prisma db push --skip-generate 2>&1"

      echo ""
      echo "✅ 数据库结构同步完毕！"
      exit
EOF

    echo ""
    echo "========================================"
    echo "🎉 NAS 端数据库结构同步完成！"
    echo ""
    echo "📌 说明："
    echo "   - 已使用 prisma db push 同步最新表结构"
    echo "   - 所有现有数据完全保留，只创建了缺失的表/字段"
    echo "   - 新 Dockerfile 已配置：以后每次选项 [2] 部署时会自动同步"
    echo "========================================"

else
    echo "❌ 错误: 无效的选择，脚本已退出。"
    exit 1
fi
