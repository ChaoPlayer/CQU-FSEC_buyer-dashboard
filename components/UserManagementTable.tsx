"use client";

import { useState, useEffect } from "react";
import { Role } from "@prisma/client";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  maxLimit: number | null;
  createdAt: string;
}

export default function UserManagementTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", {
        credentials: 'include',
      });
      if (!res.ok) throw new Error("获取用户列表失败");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (id: string, newRole: Role) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/users`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ id, role: newRole }),
      });
      if (!res.ok) throw new Error("更新角色失败");
      const updatedUser = await res.json();
      setUsers((prev) =>
        prev.map((user) => (user.id === updatedUser.id ? updatedUser : user))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMaxLimitChange = async (id: string, newMaxLimit: number | null) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/users`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ id, maxLimit: newMaxLimit }),
      });
      if (!res.ok) throw new Error("更新限额失败");
      const updatedUser = await res.json();
      setUsers((prev) =>
        prev.map((user) => (user.id === updatedUser.id ? updatedUser : user))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <strong>错误：</strong> {error}
        <button
          onClick={() => {
            setError(null);
            fetchUsers();
          }}
          className="ml-4 text-sm underline"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              邮箱
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              姓名
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              角色
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              最大限额 (¥)
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              注册时间
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {user.email}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {user.name || "—"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {updatingId === user.id ? (
                  <div className="flex items-center space-x-2">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      className="border rounded px-2 py-1 text-sm"
                      disabled={updatingId === user.id}
                    >
                      <option value="USER">用户</option>
                      <option value="ADMIN">管理员</option>
                    </select>
                  </div>
                ) : (
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === "ADMIN"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {user.role === "ADMIN" ? "管理员" : "用户"}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {updatingId === user.id ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={user.maxLimit ?? ""}
                      onChange={(e) =>
                        handleMaxLimitChange(
                          user.id,
                          e.target.value === "" ? null : parseFloat(e.target.value)
                        )
                      }
                      className="border rounded px-2 py-1 text-sm w-32"
                      placeholder="无限制"
                    />
                    <button
                      onClick={() => handleMaxLimitChange(user.id, null)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      清除
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-gray-900">
                    {user.maxLimit ? `¥${user.maxLimit.toFixed(2)}` : "无限制"}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(user.createdAt).toLocaleDateString("zh-CN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}