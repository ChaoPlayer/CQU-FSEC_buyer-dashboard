import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminPurchaseTable from "@/components/AdminPurchaseTable";
import UserManagementTable from "@/components/UserManagementTable";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const tab = (await searchParams).tab || 'purchases';

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

  const userCount = await prisma.user.count();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {tab === 'users' ? '用户管理' : '采购管理'}
          </h1>
          <p className="mt-2 text-gray-600">
            {tab === 'users' ? '管理系统注册用户，分配角色与权限。' : '管理所有用户提交的采购信息，审核、下载发票。'}
          </p>
        </div>
        <div className="text-sm text-gray-500">
          管理员：{session.user?.name || session.user?.email}
        </div>
      </div>


      {tab === 'users' ? (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">用户列表</h2>
            <div className="text-sm text-gray-500">
              共 {userCount} 位用户
            </div>
          </div>
          <UserManagementTable />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">所有采购记录</h2>
            <div className="text-sm text-gray-500">
              共 {purchases.length} 条记录
            </div>
          </div>
          <AdminPurchaseTable purchases={purchases} />
        </div>
      )}
    </div>
  );
}