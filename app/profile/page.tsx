import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Group } from "@prisma/client";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const { userId } = await searchParams;
  const targetUserId = (session.user.role === "ADMIN" && userId) ? userId : session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      email: true,
      name: true,
      realName: true,
      studentId: true,
      group: true,
      role: true,
      maxLimit: true,
      createdAt: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const groupLabels: Record<Group, string> = {
    线路组: "线路组",
    电池组: "电池组",
    电控组: "电控组",
    转向组: "转向组",
    车架组: "车架组",
    悬架组: "悬架组",
    车身组: "车身组",
    制动组: "制动组",
    传动组: "传动组",
    综合部: "综合部",
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* 头部 */}
        <div className="bg-indigo-700 px-6 py-8">
          <h1 className="text-3xl font-bold text-white">个人资料</h1>
          <p className="text-indigo-200 mt-2">查看和管理您的账户信息</p>
        </div>

        <div className="p-6 space-y-8">
          {/* 基本信息卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">账户信息</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500">邮箱</label>
                  <p className="mt-1 text-lg text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">昵称</label>
                  <p className="mt-1 text-lg text-gray-900">{user.name || "未设置"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">角色</label>
                  <p className="mt-1">
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${user.role === "ADMIN" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"}`}>
                      {user.role === "ADMIN" ? "管理员" : "用户"}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">注册时间</label>
                  <p className="mt-1 text-lg text-gray-900">{new Date(user.createdAt).toLocaleDateString("zh-CN")}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">个人信息</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500">真实姓名</label>
                  <p className="mt-1 text-lg text-gray-900">{user.realName || "未设置"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">学号</label>
                  <p className="mt-1 text-lg text-gray-900">{user.studentId || "未设置"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">所属组别</label>
                  <p className="mt-1 text-lg text-gray-900">
                    {user.group ? groupLabels[user.group] : "未设置"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">报销限额</label>
                  <p className="mt-1 text-lg text-gray-900">
                    {user.maxLimit ? `¥${user.maxLimit.toFixed(2)}` : "无限制"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 操作区域 */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">账户操作</h3>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                返回仪表盘
              </Link>
              <Link
                href="/profile/edit"
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                编辑个人资料
              </Link>
              <Link
                href="/profile/change-password"
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                修改密码
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              您的个人信息仅用于系统内部管理，不会对外公开。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}