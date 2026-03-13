"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface GroupHoursData {
  group: string;
  totalHours: number;
}

interface UserHoursData {
  userId: string;
  totalHours: number;
  user?: {
    name: string | null;
    email: string;
    group: string | null;
  };
}

interface HoursStatsChartProps {
  groupData?: GroupHoursData[];
  userData?: UserHoursData[];
  totalGroupHours?: number;
  topUserHours?: number;
  pendingCount?: number;
  warning?: string;
}

export default function HoursStatsChart({
  groupData = [],
  userData = [],
  totalGroupHours = 0,
  topUserHours = 0,
  pendingCount = 0,
  warning = '',
}: HoursStatsChartProps) {
  // 若未提供数据，显示空状态
  if (groupData.length === 0 && userData.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        暂无工时数据
      </div>
    );
  }

  // 准备横置柱状图数据（组别排名）
  const sortedGroupData = [...groupData].sort((a, b) => b.totalHours - a.totalHours).slice(0, 10);

  return (
    <div className="space-y-8">
      {/* 核心数据卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-medium text-gray-700">各组总工时</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">{totalGroupHours.toFixed(1)} 小时</p>
          <p className="text-sm text-gray-500">各组累计工时总和</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-medium text-gray-700">队员工时排行榜</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">{topUserHours.toFixed(1)} 小时</p>
          <p className="text-sm text-gray-500">最高工时队员</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-medium text-gray-700">待审批申请</h3>
          <p className="mt-2 text-3xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-sm text-gray-500">线上工作申请数</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-medium text-gray-700">工时预警</h3>
          <p className="mt-2 text-3xl font-bold text-red-600">{warning || '无'}</p>
          <p className="text-sm text-gray-500">系统监控提示</p>
        </div>
      </div>

      {/* 各组总工时横置柱状图 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">各组总工时排名</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={sortedGroupData}
              margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="group" />
              <Tooltip formatter={(value) => [`${value} 小时`, '工时']} />
              <Legend />
              <Bar dataKey="totalHours" name="工时数" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 队员工时排名表 */}
      {userData.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">队员工时排名</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">组别</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">总工时</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userData.slice(0, 10).map((item, index) => (
                  <tr key={item.userId}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.user?.name || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.user?.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.user?.group || '未分组'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{item.totalHours.toFixed(1)} 小时</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}