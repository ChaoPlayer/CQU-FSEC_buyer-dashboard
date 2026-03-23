import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import WithdrawButton from "@/app/purchases/[id]/WithdrawButton";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "ADMIN";

  if (isAdmin) {
    // 管理员数据
    const [
      pendingPurchases,
      approvedPurchases,
      totalAmountResult,
      userCount,
      activeUserGroups,
      recentPendingPurchases,
    ] = await Promise.all([
      // 待审批数量
      prisma.purchase.count({
        where: { status: "PENDING" },
      }),
      // 累积审批数量
      prisma.purchase.count({
        where: { status: "APPROVED" },
      }),
      // 总金额（所有采购）
      prisma.purchase.aggregate({
        _sum: { amount: true },
      }),
      // 用户总数
      prisma.user.count(),
      // 活跃用户分组（过去30天有采购记录的用户）
      prisma.purchase.groupBy({
        by: ["userId"],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 最近30天
          },
        },
        _count: true,
      }),
      // 最近待审批申请（最多10条）
      prisma.purchase.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          submittedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const totalAmount = totalAmountResult._sum.amount || 0;

    // 计算今日北京时间范围
    const now = new Date();
    const beijingOffset = 8 * 60 * 60 * 1000;
    const beijingTime = new Date(now.getTime() + beijingOffset);
    const todayStart = new Date(beijingTime.getFullYear(), beijingTime.getMonth(), beijingTime.getDate());
    const todayStartUTC = new Date(todayStart.getTime() - beijingOffset);
    const todayEndUTC = new Date(todayStartUTC.getTime() + 24 * 60 * 60 * 1000);

    // 考勤数据查询
    const todayAttendanceCount = await prisma.attendanceSummary.count({
      where: {
        date: {
          gte: todayStartUTC,
          lt: todayEndUTC,
        },
      },
    });
    const todayAverageResult = await prisma.attendanceSummary.aggregate({
      where: {
        date: {
          gte: todayStartUTC,
          lt: todayEndUTC,
        },
      },
      _avg: {
        totalHours: true,
      },
    });
    const todayAverageHours = todayAverageResult._avg.totalHours || 0;

    const activeUserCount = activeUserGroups.length;
    // 获取前三名活跃用户
    const topUserIds = activeUserGroups
      .sort((a, b) => b._count - a._count)
      .slice(0, 3)
      .map(g => g.userId);
    const topActiveUsers = await prisma.user.findMany({
      where: { id: { in: topUserIds } },
      select: { id: true, name: true, realName: true, email: true },
    });

    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">管理员仪表盘</h1>
          <Link
            href="/admin?tab=purchases"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            进入采购管理
          </Link>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-lg font-medium text-gray-700">待审批申请</h3>
            <p className="mt-2 text-3xl font-bold text-yellow-600">{pendingPurchases}</p>
            <p className="text-sm text-gray-500">等待处理的申请</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-lg font-medium text-gray-700">累积审批</h3>
            <p className="mt-2 text-3xl font-bold text-green-600">{approvedPurchases}</p>
            <p className="text-sm text-gray-500">已批准的申请总数</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-lg font-medium text-gray-700">总金额</h3>
            <p className="mt-2 text-3xl font-bold text-indigo-600">
              ¥{totalAmount.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">所有采购的总金额</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-lg font-medium text-gray-700">用户活跃度</h3>
            <p className="mt-2 text-3xl font-bold text-blue-600">{activeUserCount}<span className="text-lg font-normal text-gray-500">/{userCount}</span></p>
            <p className="text-sm text-gray-500">最近30天有活动的用户</p>
            {topActiveUsers.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">活跃度前三：</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {topActiveUsers.map(user => (
                    <li key={user.id} className="flex items-center">
                      <span className="truncate">{user.realName || user.email}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-lg font-medium text-gray-700">今日出勤人数</h3>
            <p className="mt-2 text-3xl font-bold text-purple-600">{todayAttendanceCount}</p>
            <p className="text-sm text-gray-500">今日已打卡队员</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-lg font-medium text-gray-700">出勤平均时长</h3>
            <p className="mt-2 text-3xl font-bold text-cyan-600">{todayAverageHours.toFixed(1)}<span className="text-lg font-normal text-gray-500"> 小时</span></p>
            <p className="text-sm text-gray-500">今日出勤队员平均工时</p>
          </div>
        </div>

        {/* 最近待审批申请 */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">最近待审批申请</h2>
            <Link
              href="/admin?tab=purchases"
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              查看全部 →
            </Link>
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
                    提交人
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
                {recentPendingPurchases.map((purchase) => (
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
                      <div className="text-sm text-gray-900">
                        {purchase.submittedBy?.name || purchase.submittedBy?.email || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(purchase.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/purchases/${purchase.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        查看
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentPendingPurchases.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                暂无待审批申请。
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 普通用户页面（原逻辑）
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
                      <WithdrawButton purchaseId={purchase.id} />
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