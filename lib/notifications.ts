import { prisma } from "./prisma";
import { Purchase, User } from "@prisma/client";

/**
 * 创建一条通知
 */
export async function createNotification({
  userId,
  type,
  title,
  content,
  purchaseId,
}: {
  userId: string;
  type: string;
  title: string;
  content?: string;
  purchaseId?: string;
}) {
  return await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      content,
      purchaseId,
    },
  });
}

/**
 * 为用户创建采购状态变更通知
 */
export async function notifyPurchaseStatusChange(
  purchase: Purchase & { submittedBy: User },
  oldStatus: string,
  newStatus: string
) {
  const statusText: Record<string, string> = {
    PENDING: "待审核",
    APPROVED: "已批准",
    REJECTED: "已拒绝",
    WITHDRAWAL_REQUESTED: "撤回申请中",
    WITHDRAWN: "已撤回",
  };

  const title = `采购状态更新：${purchase.itemName}`;
  const content = `您的采购 "${purchase.itemName}" 状态从 ${statusText[oldStatus] || oldStatus} 变更为 ${statusText[newStatus] || newStatus}。`;

  // 给采购提交者发送通知
  await createNotification({
    userId: purchase.userId,
    type: "purchase_status_updated",
    title,
    content,
    purchaseId: purchase.id,
  });

  // 如果是撤回申请，给所有管理员发送通知
  if (newStatus === "WITHDRAWAL_REQUESTED") {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: "withdrawal_requested",
        title: `新的撤回申请：${purchase.itemName}`,
        content: `用户 ${purchase.submittedBy.name || purchase.submittedBy.email} 提交了采购撤回申请，请及时处理。`,
        purchaseId: purchase.id,
      });
    }
  }
}

/**
 * 标记通知为已读
 */
export async function markNotificationAsRead(notificationId: string) {
  return await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

/**
 * 获取用户未读通知数量
 */
export async function getUnreadCount(userId: string) {
  return await prisma.notification.count({
    where: { userId, read: false },
  });
}

/**
 * 获取用户通知列表
 */
export async function getUserNotifications(userId: string, limit = 20) {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      purchase: {
        select: {
          id: true,
          itemName: true,
        },
      },
    },
  });
}