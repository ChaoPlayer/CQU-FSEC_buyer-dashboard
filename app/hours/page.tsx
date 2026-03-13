import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import WorkSubmissionForm from "@/components/WorkSubmissionForm";
import { HourType, WorkSubmissionStatus } from "@prisma/client";

export default async function HoursPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  // 获取用户的工时记录汇总
  const hourRecords = await prisma.hourRecord.groupBy({
    by: ["type"],
    where: { userId },
    _sum: {
      hours: true,
    },
  });

  const attendanceHours = hourRecords.find(r => r.type === HourType.ATTENDANCE)?._sum.hours || 0;
  const workHours = hourRecords.find(r => r.type === HourType.WORK)?._sum.hours || 0;
  const totalHours = attendanceHours + workHours;

  // 获取用户的工作提交列表
  const submissions = await prisma.workSubmission.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">工时管理</h1>
          <p className="mt-2 text-gray-600">
            查看您的工时统计，提交新的工作申请。
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
        >
          返回仪表盘
        </Link>
      </div>

      {/* 工时统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-medium text-gray-700">考勤工时</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {attendanceHours > 0 ? `${attendanceHours.toFixed(1)} 小时` : '暂无数据'}
          </p>
          <p className="text-sm text-gray-500">由管理员分发，{attendanceHours > 0 ? '已分配' : '暂无数据'}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-medium text-gray-700">我的工作工时</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">{workHours.toFixed(1)} 小时</p>
          <p className="text-sm text-gray-500">当前用户已通过的总工时</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 工作提交表单 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">提交新工作</h2>
            <WorkSubmissionForm />
          </div>
        </div>

        {/* 最近提交列表 */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">最近提交记录</h2>
          {submissions.length === 0 ? (
            <p className="text-gray-500">暂无提交记录</p>
          ) : (
            <ul className="space-y-4">
              {submissions.map((sub) => (
                <li key={sub.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{sub.title}</h4>
                      <p className="text-sm text-gray-600 truncate">{sub.description || "无描述"}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        提交时间：{new Date(sub.createdAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      sub.status === WorkSubmissionStatus.PENDING
                        ? "bg-yellow-100 text-yellow-800"
                        : sub.status === WorkSubmissionStatus.APPROVED
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {sub.status === WorkSubmissionStatus.PENDING ? "待审批" :
                       sub.status === WorkSubmissionStatus.APPROVED ? "已批准" : "已拒绝"}
                    </span>
                  </div>
                  {sub.approvedHours && (
                    <p className="text-sm text-green-700 mt-2">
                      兑换工时：<strong>{sub.approvedHours}</strong> 小时
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {submissions.length > 0 && (
            <div className="mt-4 text-center">
              <Link
                href="/hours/submissions"
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                查看全部 →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}