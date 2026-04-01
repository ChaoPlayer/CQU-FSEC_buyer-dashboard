"use client";

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { UsersIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface GroupHoursData {
  group: string;
  totalHours: number;
}

interface UserHoursData {
  userId: string;
  totalHours: number;
  user?: {
    realName: string | null;
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
  todayAttendanceCount?: number;
  todayAverageHours?: number;
  currentUserRole?: string;
}

export default function HoursStatsChart({
  groupData = [],
  userData = [],
  totalGroupHours = 0,
  topUserHours = 0,
  pendingCount = 0,
  warning = '',
  todayAttendanceCount = 0,
  todayAverageHours = 0,
  currentUserRole = '',
}: HoursStatsChartProps) {
  // 弹窗状态
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // 表单状态
  const [warningCycle, setWarningCycle] = useState('周'); // 日、周、月、年
  const [warningSpan, setWarningSpan] = useState(1);
  const [warningThreshold, setWarningThreshold] = useState(40);
  const [warningWhitelist, setWarningWhitelist] = useState<string[]>([]);

  // 同步打卡记录状态
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    success: boolean;
    message: string;
    upsertedCount: number;
    parseErrorCount: number;
    errorCount: number;
    parseErrors?: string[];
    upsertErrors?: string[];
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // 处理保存配置
  const handleSaveSettings = () => {
    const rule = {
      cycle: warningCycle,
      span: warningSpan,
      threshold: warningThreshold,
      whitelist: warningWhitelist,
    };
    console.log('预警规则配置:', rule);
    setIsSettingsOpen(false);
  };

  // 处理取消
  const handleCancelSettings = () => {
    setIsSettingsOpen(false);
  };

  // 同步打卡记录
  const handleSyncAttendance = async () => {
    setIsSyncing(true);
    setSyncProgress(null);
    try {
      const response = await fetch('/api/sync-attendance', {
        method: 'GET',
      });
      const data = await response.json();
      setSyncProgress(data);
      if (data.success) {
        // 可以显示成功消息，也可以自动刷新页面
        console.log('同步成功:', data);
      } else {
        console.error('同步失败:', data);
      }
    } catch (error) {
      console.error('同步请求失败:', error);
      setSyncProgress({
        success: false,
        message: '请求失败: ' + (error instanceof Error ? error.message : String(error)),
        upsertedCount: 0,
        parseErrorCount: 0,
        errorCount: 0,
      });
    } finally {
      setIsSyncing(false);
    }
  };

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
  // 转换为堆叠柱状图所需的数据结构（工作工时 + 考勤工时）
  const stackedGroupData = sortedGroupData.map(item => {
    // TODO: 待后端 API 响应结构调整，目前按 7:3 比例模拟拆分
    const workHours = item.totalHours * 0.7;
    const attendanceHours = item.totalHours * 0.3;
    return {
      ...item,
      workHours,
      attendanceHours,
    };
  });
  const isGroupLeader = currentUserRole === 'GROUP_LEADER';

  // 计算队员平均工时
  const totalUserHours = userData.reduce((sum, item) => sum + item.totalHours, 0);
  const averageUserHours = userData.length > 0 ? totalUserHours / userData.length : 0;

  // 准备队员工时数据（按工时降序）
  const sortedUserData = [...userData]
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 15)
    .map(item => ({
      ...item,
      name: item.user?.realName || '未知',
      group: item.user?.group || '未分组'
    }));

  // 自定义 Tooltip 组件（队员工时排名）
  const CustomUserTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
          <p className="font-semibold text-gray-800">{data.name}</p>
          <p className="text-sm text-gray-600">工时: <span className="font-medium">{data.totalHours.toFixed(1)} 小时</span></p>
          <p className="text-sm text-gray-600">组别: <span className="font-medium">{data.group}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* 核心数据卡片 */}
      <div className={`grid gap-6 ${isGroupLeader ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
        {!isGroupLeader && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-medium text-gray-600">各组总工时</h3>
              <p className="text-3xl font-bold tracking-tight text-blue-600 mt-2">{totalGroupHours.toFixed(1)} 小时</p>
              <p className="text-sm text-gray-500">各组累计工时总和</p>
            </div>
            <div className="flex flex-row gap-3 mt-4 w-full">
              <button
                onClick={() => setIsSyncModalOpen(true)}
                disabled={isSyncing}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                <ArrowPathIcon className="h-3 w-3" />
                {isSyncing ? '同步中...' : '同步'}
              </button>
              <Link
                href="/admin/history-hours"
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                历史
              </Link>
            </div>
          </div>
        )}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-600">今日出勤人数</h3>
          </div>
          <div className="flex flex-col">
            <p className="text-3xl font-bold tracking-tight text-green-600">
              {todayAttendanceCount} 人
            </p>
            <p className="text-sm text-gray-500">
              出勤队员平均时长：{todayAverageHours.toFixed(1)} 小时
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col gap-2">
          <h3 className="text-lg font-medium text-gray-600">待审批申请</h3>
          <p className="text-3xl font-bold tracking-tight text-yellow-600">{pendingCount}</p>
          <p className="text-sm text-gray-500">线上工作申请数</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col gap-2 relative">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-600">工时预警</h3>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="预警设置"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <p className="text-3xl font-bold tracking-tight text-red-600">{warning || '无'}</p>
          <p className="text-sm text-gray-500">系统监控提示</p>
        </div>
      </div>

      {/* 各组总工时横置柱状图（仅当有多个组且不是组长时显示） */}
      {!isGroupLeader && sortedGroupData.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">各组总工时排名</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={stackedGroupData}
                margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="group" />
                <Tooltip formatter={(value, name) => [`${(Number(value) || 0).toFixed(1)} 小时`, name]} />
                <Legend />
                <Bar dataKey="workHours" name="工作工时" fill="#3b82f6" stackId="a" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="attendanceHours" name="考勤工时" fill="#93c5fd" stackId="a" radius={[0, 0, 4, 4]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 队员工时排名水平柱状图 */}
      {sortedUserData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {sortedGroupData.length <= 1 || isGroupLeader ? "本组队员工时排名" : "队员工时排名"}
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={sortedUserData}
                margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip content={<CustomUserTooltip />} />
                <Legend />
                <Bar dataKey="totalHours" name="工时数" fill="#3b82f6" radius={[4, 4, 4, 4]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 预警规则设置弹窗 */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">工时预警规则设置</h3>
              
              <div className="space-y-6">
                {/* 预警计算周期 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    预警计算周期
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={warningCycle}
                    onChange={(e) => setWarningCycle(e.target.value)}
                  >
                    <option value="日">日</option>
                    <option value="周">周</option>
                    <option value="月">月</option>
                    <option value="年">年</option>
                  </select>
                </div>

                {/* 时间跨度 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    时间跨度
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      min="1"
                      className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={warningSpan}
                      onChange={(e) => setWarningSpan(parseInt(e.target.value) || 1)}
                    />
                    <span className="text-gray-600">
                      {warningCycle === '日' ? '天' : warningCycle === '周' ? '周' : warningCycle === '月' ? '个月' : '年'}内
                    </span>
                    <div className="text-sm text-gray-500">
                      组合语意：连续 {warningSpan} {warningCycle === '日' ? '天' : warningCycle === '周' ? '周' : warningCycle === '月' ? '个月' : '年'}
                    </div>
                  </div>
                </div>

                {/* 触发阈值 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    触发阈值
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-12"
                      value={warningThreshold}
                      onChange={(e) => setWarningThreshold(parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-4 top-2 text-gray-500">小时（h）</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    在上述时间跨度内，如果总工时不足该阈值，则触发预警。
                  </p>
                </div>

                {/* 豁免白名单 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    豁免白名单
                  </label>
                  <select
                    multiple
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={warningWhitelist}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setWarningWhitelist(selected);
                    }}
                    size={4}
                  >
                    <option value="队员A">队员A</option>
                    <option value="队员B">队员B</option>
                    <option value="队长">队长</option>
                    <option value="指导老师">指导老师</option>
                    <option value="管理员">管理员</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    按住 Ctrl/Cmd 可多选。被选中的人员将不会收到预警。
                  </p>
                </div>
              </div>

              {/* 底部按钮 */}
              <div className="flex justify-end space-x-4 mt-8">
                <button
                  className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  onClick={handleCancelSettings}
                >
                  取消
                </button>
                <button
                  className="px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium transition-colors"
                  onClick={handleSaveSettings}
                >
                  保存配置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 同步打卡记录弹窗 */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">同步打卡记录</h3>
              
              {isSyncing ? (
                <div className="text-center py-8">
                  <ArrowPathIcon className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
                  <p className="mt-4 text-gray-600">正在同步打卡记录，请稍候...</p>
                </div>
              ) : syncProgress ? (
                <div className="space-y-6">
                  <div className={`p-4 rounded-lg ${syncProgress.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <h4 className={`font-semibold ${syncProgress.success ? 'text-green-800' : 'text-red-800'}`}>
                      {syncProgress.success ? '同步成功' : '同步失败'}
                    </h4>
                    <p className="mt-2 text-gray-700">{syncProgress.message}</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">成功同步</p>
                      <p className="text-2xl font-bold text-blue-600">{syncProgress.upsertedCount} 条</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">解析失败</p>
                      <p className="text-2xl font-bold text-yellow-600">{syncProgress.parseErrorCount} 条</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">处理失败</p>
                      <p className="text-2xl font-bold text-red-600">{syncProgress.errorCount} 条</p>
                    </div>
                  </div>

                  {syncProgress.parseErrors && syncProgress.parseErrors.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">解析错误（前10条）</h5>
                      <ul className="text-sm text-gray-600 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                        {syncProgress.parseErrors.map((err, idx) => (
                          <li key={idx} className="py-1 border-b last:border-0">• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {syncProgress.upsertErrors && syncProgress.upsertErrors.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">处理错误（前10条）</h5>
                      <ul className="text-sm text-gray-600 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                        {syncProgress.upsertErrors.map((err, idx) => (
                          <li key={idx} className="py-1 border-b last:border-0">• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-gray-600">
                    此操作将从CSV文件读取打卡记录，计算工时并发放给对应队员。
                  </p>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-yellow-800">
                      <strong>注意：</strong> 同步过程可能需要几分钟，请勿关闭页面。
                    </p>
                  </div>
                </div>
              )}

              {/* 底部按钮 */}
              <div className="flex justify-end space-x-4 mt-8">
                {!isSyncing && !syncProgress && (
                  <button
                    className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    onClick={() => setIsSyncModalOpen(false)}
                  >
                    取消
                  </button>
                )}
                {!syncProgress && (
                  <button
                    className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                    onClick={handleSyncAttendance}
                    disabled={isSyncing}
                  >
                    {isSyncing ? '同步中...' : '开始同步'}
                  </button>
                )}
                {syncProgress && (
                  <>
                    <button
                      className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                      onClick={() => setIsSyncModalOpen(false)}
                    >
                      关闭
                    </button>
                    <button
                      className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors"
                      onClick={() => {
                        setSyncProgress(null);
                        setIsSyncModalOpen(false);
                      }}
                    >
                      完成
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}