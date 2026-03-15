import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import AdminPurchaseTable from "@/components/AdminPurchaseTable";
import UserManagementTable from "@/components/UserManagementTable";
import GroupFilter from "@/components/GroupFilter";
import HoursStatsChart from "@/components/HoursStatsChart";
import AdminWorkSubmissionTable from "@/components/AdminWorkSubmissionTable";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; subtab?: string; group?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "GROUP_LEADER")) {
    redirect("/dashboard");
  }

  // 获取当前用户详细信息（包括审批额度）
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    // @ts-ignore
    select: { id: true, role: true, group: true, approvalLimit: true },
  });
  if (!currentUser) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const tab = params.tab || 'purchases';
  const group = params.group;
  let subtab = params.subtab;
  if (!subtab) {
    subtab = tab === 'hours' ? 'stats' : 'overview';
  }

  // 获取所有采购记录，包含用户信息（根据子选项卡筛选）
  const whereClause: any = {};
  if (subtab === 'group' && group) {
    whereClause.submittedBy = {
      group: group,
    };
  }
  // 组长只能查看同组用户的采购
  if (currentUser.role === ('GROUP_LEADER' as Role)) {
    whereClause.submittedBy = {
      ...whereClause.submittedBy,
      group: currentUser.group,
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
          realName: true,
          group: true,
        },
      },
    },
  });

  // 获取待审批工作申请数量
  const pendingSubmissionsCount = await prisma.workSubmission.count({
    where: { status: 'PENDING' },
  });

  // 获取各组总工时（用于横置柱状图）
  const groupHours = await prisma.hourRecord.groupBy({
    by: ['userId'],
    where: {},
    _sum: {
      hours: true,
    },
  });
  const userIds = groupHours.map(gh => gh.userId);
  const usersWithGroup = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, group: true },
  });
  // 按组别聚合
  const groupMap: Record<string, number> = {};
  groupHours.forEach(gh => {
    const user = usersWithGroup.find(u => u.id === gh.userId);
    const group = user?.group || '未分组';
    groupMap[group] = (groupMap[group] || 0) + (gh._sum.hours || 0);
  });
  const groupHoursData = Object.entries(groupMap).map(([group, totalHours]) => ({
    group,
    totalHours,
  })).sort((a, b) => b.totalHours - a.totalHours);

  // 获取队员工时排名
  const userHours = await prisma.hourRecord.groupBy({
    by: ['userId'],
    where: {},
    _sum: {
      hours: true,
    },
    orderBy: {
      _sum: {
        hours: 'desc',
      },
    },
    take: 20,
  });
  const userIds2 = userHours.map(uh => uh.userId);
  const usersDetails = await prisma.user.findMany({
    where: { id: { in: userIds2 } },
    select: { id: true, email: true, name: true, realName: true, group: true },
  });
  const userHoursData = userHours.map(uh => ({
    userId: uh.userId,
    totalHours: uh._sum.hours || 0,
    user: usersDetails.find(u => u.id === uh.userId),
  }));

  // 计算各组总工时之和
  const totalGroupHours = groupHoursData.reduce((sum, item) => sum + item.totalHours, 0);
  // 获取队员工时排行榜中的最高工时
  const topUserHours = userHoursData.length > 0 ? userHoursData[0].totalHours : 0;

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

  // 获取工作申请列表（用于审批子选项卡）
  const whereClauseForSubmissions: any = {};
  if (group) {
    whereClauseForSubmissions.user = {
      group: group,
    };
  }
  const workSubmissions = await prisma.workSubmission.findMany({
    where: whereClauseForSubmissions,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          realName: true,
          group: true,
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
            {tab === 'users' ? '用户管理' : tab === 'hours' ? '工时管理' : '采购管理'}
          </h1>
          <p className="mt-2 text-gray-600">
            {tab === 'users' ? '管理系统注册用户，分配角色与权限。' : tab === 'hours' ? '管理工时统计、审批工作申请。' : '管理所有用户提交的采购信息，审核、下载发票。'}
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
      ) : tab === 'hours' ? (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">工时管理</h2>
              <div className="flex space-x-4 mt-2">
                <Link
                  href="/admin?tab=hours&subtab=stats"
                  className={`px-3 py-1 text-sm rounded ${subtab === 'stats' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  统计
                </Link>
                <Link
                  href="/admin?tab=hours&subtab=approval"
                  className={`px-3 py-1 text-sm rounded ${subtab === 'approval' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  审批
                </Link>
                <Link
                  href="/admin?tab=hours&subtab=group"
                  className={`px-3 py-1 text-sm rounded ${subtab === 'group' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  分组管理
                </Link>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              待审批申请：{pendingSubmissionsCount} 条
            </div>
          </div>
          <div className="p-6">
            {subtab === 'stats' ? (
              <HoursStatsChart
                groupData={groupHoursData}
                userData={userHoursData}
                totalGroupHours={totalGroupHours}
                topUserHours={topUserHours}
                pendingCount={pendingSubmissionsCount}
                warning=""
              />
            ) : (
              <div>
                {subtab === 'group' && (
                  <GroupFilter
                    groups={distinctGroups}
                    currentGroup={group}
                    subtab={subtab}
                    tab="hours"
                  />
                )}
                <AdminWorkSubmissionTable submissions={workSubmissions} />
              </div>
            )}
          </div>
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

          <AdminPurchaseTable purchases={purchases} currentUser={currentUser as any} />
        </div>
      )}
    </div>
  );
}