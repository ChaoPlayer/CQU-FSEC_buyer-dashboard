"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Group, Role } from "@prisma/client";

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  realName: string | null;
  studentId: string | null;
  group: Group | null;
  role: string;
  maxLimit: number | null;
  createdAt: string;
};

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

export default function EditProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userIdParam = searchParams.get("userId");

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 当前用户角色（从会话推断，稍后从 API 获取）
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // 初始化时获取当前用户角色和资料
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. 无论如何，先获取当前登录用户自己的信息，用来判断 isAdmin 权限
        const currentUserRes = await fetch("/api/profile");
        if (!currentUserRes.ok) throw new Error("无法验证当前用户权限");
        const currentUserData = await currentUserRes.json();
        
        setIsAdmin(currentUserData.role === "ADMIN");
        setCurrentUserRole(currentUserData.role);

        // 2. 根据是否存在 userIdParam，决定表单要渲染谁的数据
        if (userIdParam) {
          // 管理员在编辑别人
          const targetUserRes = await fetch(`/api/profile?userId=${userIdParam}`);
          if (!targetUserRes.ok) throw new Error("无法加载目标用户资料");
          const targetUserData = await targetUserRes.json();
          setProfile(targetUserData);
        } else {
          // 用户在编辑自己
          setProfile(currentUserData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userIdParam]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!profile) return;
    const { name, value } = e.target;
    setProfile({
      ...profile,
      [name]: value === "" ? null : value,
    });
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile) return;
    const { name, value } = e.target;
    setProfile({
      ...profile,
      [name]: value === "" ? null : parseFloat(value),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    // 根据权限构建更新数据
    const updateData: any = {};
    if (isAdmin) {
      // 管理员可以更新所有字段
      updateData.name = profile.name;
      updateData.realName = profile.realName;
      updateData.studentId = profile.studentId;
      updateData.group = profile.group;
      updateData.maxLimit = profile.maxLimit;
      updateData.role = profile.role;
    } else {
      // 普通用户只能更新组别
      updateData.group = profile.group;
    }

    try {
      const url = userIdParam
        ? `/api/profile?userId=${userIdParam}`
        : "/api/profile";
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "更新失败");
      }
      setSuccess(true);
      // 成功后跳转回个人资料页面
      setTimeout(() => {
        router.push(userIdParam ? `/profile?userId=${userIdParam}` : "/profile");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center">加载中…</div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800">加载失败</h2>
          <p className="text-red-600 mt-2">{error}</p>
          <Link href="/profile" className="mt-4 inline-block text-indigo-600 hover:underline">
            返回个人资料
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">编辑个人资料</h1>
        <p className="text-gray-600 mt-2">
          {userIdParam && isAdmin ? "编辑用户资料（管理员）" : "编辑您的个人资料"}
        </p>
      </div>

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">✅ 资料更新成功，即将返回…</p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">❌ {error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 账户信息（只读） */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">账户信息</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500">邮箱</label>
                  <p className="mt-1 text-lg text-gray-900">{profile?.email}</p>
                  <p className="text-sm text-gray-400">邮箱不可更改</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">角色</label>
                  {isAdmin ? (
                    <select
                      id="role"
                      name="role"
                      value={profile?.role || "USER"}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base h-10 px-3"
                    >
                      <option value="USER">用户</option>
                      <option value="GROUP_LEADER">组长</option>
                      <option value="ADMIN">管理员</option>
                    </select>
                  ) : (
                    <p className="mt-1">
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        profile?.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800"
                          : profile?.role === "GROUP_LEADER"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {profile?.role === "ADMIN" ? "管理员" : profile?.role === "GROUP_LEADER" ? "组长" : "用户"}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 个人信息（可编辑） */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">个人信息</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 昵称 */}
                {isAdmin && (
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      昵称
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={profile?.name || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base h-10 px-3"
                      placeholder="未设置"
                    />
                  </div>
                )}

                {/* 真实姓名 */}
                {isAdmin && (
                  <div>
                    <label htmlFor="realName" className="block text-sm font-medium text-gray-700">
                      真实姓名
                    </label>
                    <input
                      type="text"
                      id="realName"
                      name="realName"
                      value={profile?.realName || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base h-10 px-3"
                      placeholder="未设置"
                    />
                  </div>
                )}

                {/* 学号 */}
                {isAdmin && (
                  <div>
                    <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">
                      学号
                    </label>
                    <input
                      type="text"
                      id="studentId"
                      name="studentId"
                      value={profile?.studentId || ""}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base h-10 px-3"
                      placeholder="未设置"
                    />
                  </div>
                )}

                {/* 组别（所有用户可编辑） */}
                <div>
                  <label htmlFor="group" className="block text-sm font-medium text-gray-700">
                    所属组别
                  </label>
                  <select
                    id="group"
                    name="group"
                    value={profile?.group || ""}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base h-10 px-3"
                  >
                    <option value="">未设置</option>
                    {Object.entries(groupLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 报销限额（仅管理员） */}
                {isAdmin && (
                  <div>
                    <label htmlFor="maxLimit" className="block text-sm font-medium text-gray-700">
                      报销限额（元）
                    </label>
                    <input
                      type="number"
                      id="maxLimit"
                      name="maxLimit"
                      step="0.01"
                      value={profile?.maxLimit === null ? "" : profile?.maxLimit}
                      onChange={handleNumberChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base h-10 px-3"
                      placeholder="留空表示无限制"
                    />
                    <p className="text-sm text-gray-500 mt-1">设置为空表示无限制</p>
                  </div>
                )}
              </div>
            </div>

            {/* 按钮区域 */}
            <div className="border-t pt-6 flex flex-wrap gap-4">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "保存中…" : "保存更改"}
              </button>
              <Link
                href={userIdParam ? `/profile?userId=${userIdParam}` : "/profile"}
                className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                取消
              </Link>
              {isAdmin && (
                <Link
                  href="/admin?tab=users"
                  className="px-5 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  返回用户管理
                </Link>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}