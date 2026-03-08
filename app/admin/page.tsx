import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminPurchaseTable from "@/components/AdminPurchaseTable";
import UserManagementTable from "@/components/UserManagementTable";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // 获取所有采购记录，包含用户信息
  const purchases = await prisma.purchase.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      submittedBy: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  // 统计信息
  const totalAmount = purchases.reduce((sum, p) => sum + p.amount, 0);
  const pendingCount = purchases.filter(p => p.status === "PENDING").length;
  const userCount = await prisma.user.count();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">管理员面板</h1>
          <p className="mt-2 text-gray-600">
            管理所有用户提交的采购信息，审核、下载发票，查看统计。
          </p>
        </div>
        <div className="text-sm text-gray-500">
          管理员：{session.user?.name || session.user?.email}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-medium text-gray-700">总采购金额</h3>
          <p className="mt-2 text-3xl font-bold text-indigo-600">
            ¥{totalAmount.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500">来自 {purchases.length} 笔采购</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-medium text-gray-700">待审核</h3>
          <p className="mt-2 text-3xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-sm text-gray-500">等待处理的采购</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-medium text-gray-700">注册用户</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">{userCount}</p>
          <p className="text-sm text-gray-500">已注册用户数量</p>
        </div>
      </div>

      {/* 用户管理 */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">用户管理</h2>
          <div className="text-sm text-gray-500">
            共 {userCount} 位用户
          </div>
        </div>
        <UserManagementTable />
      </div>

      {/* 采购表格 */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">所有采购记录</h2>
          <div className="text-sm text-gray-500">
            共 {purchases.length} 条记录
          </div>
        </div>
        <AdminPurchaseTable purchases={purchases} />
      </div>
    </div>
  );
}