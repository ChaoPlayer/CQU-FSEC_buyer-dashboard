import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HourType } from "@prisma/client";
import Link from "next/link";

export default async function HistoryHoursPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  // 仅管理员和组长可访问
  const userRole = session.user.role;
  if (userRole !== "ADMIN" && userRole !== "GROUP_LEADER") {
    redirect("/dashboard");
  }

  // 计算本周的起始日期（周一）
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // 查询所有用户的累计工时
  const userHours = await prisma.hourRecord.groupBy({
    by: ["userId"],
    _sum: {
      hours: true,
    },
    _count: {
      id: true,
    },
  });

  // 获取用户详细信息
  const userIds = userHours.map(uh => uh.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      email: true,
      realName: true,
      group: true,
    },
  });

  // 构建用户工时数据
  const userHoursData = userHours.map(uh => {
    const user = users.find(u => u.id === uh.userId);
    const weeklyHours = weekHoursMap.get(uh.userId) || 0;
    return {
      userId: uh.userId,
      totalHours: uh._sum.hours || 0,
      weeklyHours,
      recordCount: uh._count.id,
      user,
    };
  });

  // 按组别汇总
  const groupMap = new Map<string, number>();
  userHoursData.forEach(uh => {
    const group = uh.user?.group || "未分组";
    const current = groupMap.get(group) || 0;
    groupMap.set(group, current + uh.totalHours);
  });
  const groupHoursData = Array.from(groupMap.entries()).map(([group, totalHours]) => ({
    group,
    totalHours,
  }));

  // 查询本周每个用户的工时（所有类型）
  const weekHoursByUser = await prisma.hourRecord.groupBy({
    by: ["userId"],
    where: {
      createdAt: {
        gte: startOfWeek,
        lte: endOfWeek,
      },
    },
    _sum: {
      hours: true,
    },
  });
  // 构建 userId -> 本周工时的映射
  const weekHoursMap = new Map<string, number>();
  weekHoursByUser.forEach(entry => {
    weekHoursMap.set(entry.userId, entry._sum.hours || 0);
  });

  // 查询本周出勤工时
  const weekAttendanceHours = await prisma.hourRecord.aggregate({
    where: {
      type: HourType.ATTENDANCE,
      createdAt: {
        gte: startOfWeek,
        lte: endOfWeek,
      },
    },
    _sum: {
      hours: true,
    },
    _count: {
      id: true,
    },
  });

  // 查询本周出勤人数（去重）
  const weekAttendanceUsers = await prisma.hourRecord.groupBy({
    by: ["userId"],
    where: {
      type: HourType.ATTENDANCE,
      createdAt: {
        gte: startOfWeek,
        lte: endOfWeek,
      },
    },
  });

  // 查询本周出勤记录详情（按天）
  const weekAttendanceByDay = await prisma.hourRecord.groupBy({
    by: ["createdAt"],
    where: {
      type: HourType.ATTENDANCE,
      createdAt: {
        gte: startOfWeek,
        lte: endOfWeek,
      },
    },
    _sum: {
      hours: true,
    },
  });

  // 格式化按天数据
  const dayMap = new Map<string, number>();
  weekAttendanceByDay.forEach(item => {
    const date = new Date(item.createdAt).toISOString().split('T')[0];
    const current = dayMap.get(date) || 0;
    dayMap.set(date, current + (item._sum.hours || 0));
  });
  const attendanceByDay = Array.from(dayMap.entries()).map(([date, hours]) => ({
    date,
    hours,
  })).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">历史总工时</h1>
          <p className="mt-2 text-gray-600">
            查看所有用户的累计工时、本周出勤情况等统计信息。
          </p>
        </div>
        <div className="flex space-x-4">
          <Link
            href="/admin?tab=hours"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            返回工时管理
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            返回仪表盘
          </Link>
        </div>
      </div>

      {/* 核心统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-medium text-gray-700">总用户数</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">{users.length} 人</p>
          <p className="text-sm text-gray-500">已录入工时的用户</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-medium text-gray-700">累计总工时</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {userHoursData.reduce((sum, uh) => sum + uh.totalHours, 0).toFixed(1)} 小时
          </p>
          <p className="text-sm text-gray-500">所有用户工时总和</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-medium text-gray-700">本周出勤工时</h3>
          <p className="mt-2 text-3xl font-bold text-yellow-600">
            {weekAttendanceHours._sum.hours?.toFixed(1) || "0"} 小时
          </p>
          <p className="text-sm text-gray-500">本周考勤工时总和</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-medium text-gray-700">本周出勤人数</h3>
          <p className="mt-2 text-3xl font-bold text-purple-600">
            {weekAttendanceUsers.length} 人
          </p>
          <p className="text-sm text-gray-500">本周有打卡记录的用户</p>
        </div>
      </div>

      {/* 组别工时排名 */}
      {groupHoursData.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">各组累计工时排名</h3>
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    排名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    组别
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    总工时
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    平均工时
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {groupHoursData
                  .sort((a, b) => b.totalHours - a.totalHours)
                  .map((group, index) => {
                    const groupUsers = userHoursData.filter(uh => uh.user?.group === group.group);
                    const avgHours = groupUsers.length > 0 
                      ? groupUsers.reduce((sum, uh) => sum + uh.totalHours, 0) / groupUsers.length 
                      : 0;
                    return (
                      <tr key={group.group} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${index < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 truncate font-medium text-gray-900">
                          {group.group}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-bold text-blue-600">{group.totalHours.toFixed(1)}</span> 小时
                        </td>
                        <td className="px-4 py-3 truncate text-gray-600">
                          {groupUsers.length} 人
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-medium text-green-600">{avgHours.toFixed(1)}</span> 小时
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 用户工时排名 */}
      {userHoursData.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">用户累计工时排名</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    排名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    姓名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    邮箱
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    组别
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    累计工时
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    本周工时
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    记录数
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {userHoursData
                  .sort((a, b) => b.totalHours - a.totalHours)
                  .map((user, index) => (
                    <tr key={user.userId} className="hover:bg-gray-50 even:bg-gray-50/50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${index < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                        {user.user?.realName || "未命名"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {user.user?.email || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          {user.user?.group || "未分组"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-blue-600">{user.totalHours.toFixed(1)}</span> 小时
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`font-medium ${user.weeklyHours === 0 ? 'text-gray-400' : 'text-emerald-600'}`}>{user.weeklyHours?.toFixed(1) || '0.0'}</span> 小时
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {user.recordCount} 条
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            共 {userHoursData.length} 名用户。
          </p>
        </div>
      )}

      {/* 本周出勤每日趋势 */}
      {attendanceByDay.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">本周出勤每日趋势</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    日期
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    出勤工时
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    进度条
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {attendanceByDay.map((day) => {
                  const maxHours = Math.max(...attendanceByDay.map(d => d.hours), 1);
                  const percentage = (day.hours / maxHours) * 100;
                  return (
                    <tr key={day.date} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                        {day.date}（{new Date(day.date).toLocaleDateString('zh-CN', { weekday: 'short' })}）
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-green-600">{day.hours.toFixed(1)}</span> 小时
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div
                            className="bg-green-600 h-4 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 备注 */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h4 className="font-medium text-gray-800 mb-2">说明</h4>
        <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
          <li>累计总工时：所有用户的所有工时记录总和，包括考勤工时和工作工时。</li>
          <li>本周出勤工时：仅统计本周（周一至周日）的考勤工时。</li>
          <li>用户工时排名：按累计工时排序，仅显示前20名。</li>
          <li>数据实时更新，每次同步打卡记录后会自动刷新。</li>
        </ul>
      </div>
    </div>
  );
}