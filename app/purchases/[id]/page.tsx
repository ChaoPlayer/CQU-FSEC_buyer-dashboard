import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Status } from "@prisma/client";
import { PurchaseWithUser } from '@/types';
import Link from "next/link";
import WithdrawButton from "./WithdrawButton";
import AdminWithdrawActions from "./AdminWithdrawActions";
import AdminActions from "./AdminActions";

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      submittedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      statusHistory: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!purchase) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">采购记录不存在</h1>
        <p className="mt-2 text-gray-600">找不到 ID 为 {id} 的采购记录。</p>
        <Link href="/dashboard" className="mt-4 inline-block text-indigo-600 hover:underline">
          返回仪表盘
        </Link>
      </div>
    );
  }

  // 权限检查：用户只能查看自己的采购，管理员可以查看所有
  if (session.user.role !== "ADMIN" && purchase.userId !== session.user.id) {
    redirect("/dashboard");
  }

  const isOwner = purchase.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  // 状态显示文本
  const statusText = {
    PENDING: "待审核",
    APPROVED: "已批准",
    REJECTED: "已拒绝",
    WITHDRAWAL_REQUESTED: "撤回申请中",
    WITHDRAWN: "已撤回",
  }[purchase.status as string] || purchase.status;

  // 状态颜色
  const statusColor = {
    PENDING: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    WITHDRAWAL_REQUESTED: "bg-purple-100 text-purple-800",
    WITHDRAWN: "bg-gray-100 text-gray-800",
  }[purchase.status as string] || "bg-gray-100 text-gray-800";

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">采购详情</h1>
          <p className="text-gray-500 mt-1">采购记录 ID: {purchase.id}</p>
        </div>
        <div className="flex space-x-4">
          <Link
            href="/dashboard"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            返回列表
          </Link>
          {isOwner && purchase.status === "PENDING" && (
            <WithdrawButton purchaseId={purchase.id} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 左侧卡片：基本信息 */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">采购物品信息</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">物品名称</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">{purchase.itemName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">采购类型</dt>
                <dd className="mt-1 text-gray-900">{(purchase as any).category || "未指定"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">总金额</dt>
                <dd className="mt-1 text-2xl font-bold text-indigo-600">
                  {purchase.currency} {purchase.amount.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">状态</dt>
                <dd className="mt-1">
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusColor}`}>
                    {statusText}
                  </span>
                </dd>
              </div>
              {(purchase as any).processorContact && (
                <div className="md:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">加工商联系方式</dt>
                  <dd className="mt-1 text-gray-900">{(purchase as any).processorContact}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">物资类别</dt>
                <dd className="mt-1 text-gray-900">{(purchase as any).materialCategory || '未指定'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">是否已开发票</dt>
                <dd className="mt-1 text-gray-900">{(purchase as any).hasInvoice ? '是' : '否'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">是否垫付</dt>
                <dd className="mt-1 text-gray-900">{(purchase as any).isAdvancedPayment ? '是' : '否'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">垫付人</dt>
                <dd className="mt-1 text-gray-900">{(purchase as any).advancerName || '无'}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">购买链接</dt>
                <dd className="mt-1">
                  {purchase.buyLink ? (
                    <a
                      href={purchase.buyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      {purchase.buyLink}
                    </a>
                  ) : (
                    "未提供"
                  )}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">备注</dt>
                <dd className="mt-1 text-gray-900 whitespace-pre-line">{purchase.note || "无"}</dd>
              </div>
            </dl>
          </div>

          {/* 文件附件 */}
          {(purchase.imageUrl || purchase.pdfUrl) && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">附件</h2>
              <div className="flex flex-wrap gap-4">
                {purchase.imageUrl && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">物品图片</p>
                    <a
                      href={purchase.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-indigo-600 hover:underline"
                    >
                      查看图片
                    </a>
                  </div>
                )}
                {purchase.pdfUrl && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">发票 PDF</p>
                    <a
                      href={purchase.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-indigo-600 hover:underline"
                    >
                      下载 PDF
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 右侧卡片：元信息 */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">提交信息</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">提交者</dt>
                <dd className="mt-1 text-gray-900">{purchase.submittedBy.name || purchase.submittedBy.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">提交时间</dt>
                <dd className="mt-1 text-gray-900">
                  {new Date(purchase.createdAt).toLocaleString("zh-CN")}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">最后更新</dt>
                <dd className="mt-1 text-gray-900">
                  {new Date(purchase.updatedAt).toLocaleString("zh-CN")}
                </dd>
              </div>
            </dl>
          </div>

          {/* 管理操作（管理员） */}
          {isAdmin && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">管理操作</h2>
              <AdminActions purchase={purchase} />
              {(purchase.status as string) === "WITHDRAWAL_REQUESTED" && (
                <div className="mt-6 pt-6 border-t">
                  <AdminWithdrawActions purchaseId={purchase.id} />
                </div>
              )}
            </div>
          )}

          {/* 申请状态（普通用户） */}
          {!isAdmin && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">申请状态</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">当前状态：</span>
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusColor}`}>
                    {statusText}
                  </span>
                </div>
                {purchase.status === "REJECTED" && purchase.rejectionReason && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-700">拒绝理由：</p>
                    <p className="text-sm text-gray-600 mt-1">{purchase.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 状态历史 */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">状态历史</h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2"></div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-700">创建采购申请</span>
                  <span className="text-sm text-gray-500 ml-2">于 {new Date(purchase.createdAt).toLocaleString("zh-CN")}</span>
                  <p className="text-xs text-gray-400 mt-1">状态：待审核</p>
                </div>
              </li>
              {purchase.statusHistory && purchase.statusHistory.map((history, idx) => {
                const historyStatusText = {
                  PENDING: "待审核",
                  APPROVED: "已批准",
                  REJECTED: "已拒绝",
                  WITHDRAWAL_REQUESTED: "撤回申请中",
                  WITHDRAWN: "已撤回",
                }[history.status] || history.status;
                const historyColor = {
                  PENDING: "bg-yellow-500",
                  APPROVED: "bg-green-500",
                  REJECTED: "bg-red-500",
                  WITHDRAWAL_REQUESTED: "bg-purple-500",
                  WITHDRAWN: "bg-gray-500",
                }[history.status] || "bg-gray-500";
                return (
                  <li key={history.id} className="flex items-start">
                    <div className={`w-2 h-2 ${historyColor} rounded-full mr-3 mt-2`}></div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-700">状态变更为 {historyStatusText}</span>
                      <span className="text-sm text-gray-500 ml-2">于 {new Date(history.createdAt).toLocaleString("zh-CN")}</span>
                      {history.reason && (
                        <p className="text-sm text-gray-600 mt-1">理由：{history.reason}</p>
                      )}
                      {history.createdBy && (
                        <p className="text-xs text-gray-400 mt-1">操作者 ID：{history.createdBy}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}