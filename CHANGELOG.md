# 更新日志

## [未发布] - 2026-03-09

### 新增
- 采购详情页面新增管理员操作组件（`AdminActions.tsx`），提供“批准申请”与“驳回申请”两个按钮，驳回时可填写或修改拒绝理由。
- 数据库 `Purchase` 模型增加 `rejectionReason` 字段（字符串，可选），用于存储驳回理由。

### 改进
- 通知悬停延迟从 300ms 缩短至 150ms，提升交互响应速度。
- 采购详情页面移除右上角“管理”按钮，将“管理操作”区域重构为直观的批准/驳回操作界面。
- 普通用户视角的采购详情页面新增“申请状态”展示区域，清晰显示批准状态或被驳回理由。
- 管理员用户管理页面支持直接编辑用户的最大限额（maxLimit），实时保存。
- 顶部导航栏“采购管理”与“用户管理”链接现在根据 `?tab=` 参数独立高亮，避免两者同时激活。
- 通知下拉框样式优化：移除外边框，消息之间改用灰色分隔线（`divide-y divide-gray-200`），视觉效果更柔和。

### 修复
- 修复 Prisma 客户端验证错误（`Unknown argument 'rejectionReason'`），通过重新生成 Prisma 客户端类型并重启开发服务器解决。
- 修复用户个人资料页面中“管理”按钮导致的客户端组件事件传递错误（改为 `Link` 组件）。
- 修复用户管理表格中统计字段 `undefined` 导致的 `toFixed` 错误，使用安全渲染（`?.toFixed(2) ?? '0.00'`）。

### 技术调整
- 更新 Prisma 数据模型（`schema.prisma`），增加 `realName`、`studentId`、`group` 字段及 `Group` 枚举。
- 同步数据库结构（`prisma db push`）。
- 更新 `.gitignore`，忽略 SQLite 数据库文件 `prisma/dev.db` 和 `data/` 目录。
- 扩展采购 API（`app/api/purchases/[id]/route.ts`）的 `PUT` 处理器，支持接收和存储 `rejectionReason` 参数，并在状态变为 `APPROVED` 时自动清空理由。