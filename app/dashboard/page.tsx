import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  // 获取当前用户的采购记录
  const purchases = await prisma.purchase.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      submittedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  const totalAmount = purchases.reduce((sum, p) => sum + p.amount, 0);
  const pendingCount = purchases.filter(p => p.status === "PENDING").length;
  const approvedCount = purchases.filter(p => p.status === "APPROVED").length;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">我的采购仪表盘</h1>
        <Link
          href="/purchases/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          + 提交新采购
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-medium text-gray-700">总采购金额</h3>
          <p className="mt-2 text-3xl font-bold text-indigo-600">
            ¥{totalAmount.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500">累计提交 {purchases.length} 笔</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-medium text-gray-700">待审核</h3>
          <p className="mt-2 text-3xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-sm text-gray-500">等待管理员审批</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-medium text-gray-700">已批准</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">{approvedCount}</p>
          <p className="text-sm text-gray-500">已通过的采购</p>
        </div>
      </div>

      {/* 采购列表 */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">近期采购记录</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  物品名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  提交时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {purchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {purchase.itemName}
                    </div>
                    {purchase.note && (
                      <div className="text-sm text-gray-500">{purchase.note}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      ¥{purchase.amount.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">{purchase.currency}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        purchase.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : purchase.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {purchase.status === "APPROVED"
                        ? "已批准"
                        : purchase.status === "REJECTED"
                        ? "已拒绝"
                        : "待审核"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(purchase.createdAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/purchases/${purchase.id}`}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      查看
                    </Link>
                    {purchase.status === "PENDING" && (
                      <button className="text-red-600 hover:text-red-900">
                        撤回
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {purchases.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              暂无采购记录，点击右上角按钮提交第一个采购。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}