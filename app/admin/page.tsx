import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminPurchaseTable from "@/components/AdminPurchaseTable";
import UserManagementTable from "@/components/UserManagementTable";
import GroupFilter from "@/components/GroupFilter";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; subtab?: string; group?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const tab = params.tab || 'purchases';
  const subtab = params.subtab || 'overview';
  const group = params.group;

  // 获取所有采购记录，包含用户信息（根据子选项卡筛选）
  const whereClause: any = {};
  if (subtab === 'group' && group) {
    whereClause.submittedBy = {
      group: group,
    };
  }

  const purchases = await prisma.purchase.findMany({
    where: whereClause,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      submittedBy: {
        select: {
          id: true,
          email: true,
          name: true,
          group: true,
        },
      },
    },
  });

  // 获取所有不重复的组别（用于下拉菜单）
  const distinctGroups = await prisma.user.groupBy({
    by: ['group'],
    where: {
      group: { not: null },
    },
    orderBy: {
      group: 'asc',
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
            <div>
              <h2 className="text-xl font-semibold text-gray-800">采购管理</h2>
              <div className="flex space-x-4 mt-2">
                <Link
                  href="/admin?tab=purchases&subtab=overview"
                  className={`px-3 py-1 text-sm rounded ${subtab === 'overview' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  总览
                </Link>
                <Link
                  href="/admin?tab=purchases&subtab=group"
                  className={`px-3 py-1 text-sm rounded ${subtab === 'group' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  分组管理
                </Link>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              共 {purchases.length} 条记录
            </div>
          </div>

          {subtab === 'group' && (
            <GroupFilter
              groups={distinctGroups}
              currentGroup={group}
              subtab={subtab}
            />
          )}

          <AdminPurchaseTable purchases={purchases} />
        </div>
      )}
    </div>
  );
}