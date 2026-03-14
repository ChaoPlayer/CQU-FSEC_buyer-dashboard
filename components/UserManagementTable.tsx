"use client";

import { useState, useEffect } from "react";
import { Role } from "@prisma/client";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  maxLimit: number | null;
  approvalLimit: number | null;
  createdAt: string;
  totalPurchases: number;
  totalAmount: number;
  pendingCount: number;
}

export default function UserManagementTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingMaxLimitId, setEditingMaxLimitId] = useState<string | null>(null);
  const [tempMaxLimit, setTempMaxLimit] = useState<string>('');

  const [editingApprovalLimitId, setEditingApprovalLimitId] = useState<string | null>(null);
  const [tempApprovalLimit, setTempApprovalLimit] = useState<string>('');

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
        prev.map((user) =>
          user.id === updatedUser.id
            ? {
                ...user,
                ...updatedUser,
                totalPurchases: user.totalPurchases,
                totalAmount: user.totalAmount,
                pendingCount: user.pendingCount,
              }
            : user
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMaxLimitChange = async (id: string, newMaxLimit: number | null) => {
    console.log('handleMaxLimitChange', { id, newMaxLimit });
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/users`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ id, maxLimit: newMaxLimit }),
      });
      console.log('响应状态:', res.status, res.ok);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('更新限额失败:', errorText);
        throw new Error(`更新限额失败: ${res.status} ${errorText}`);
      }
      const updatedUser = await res.json();
      console.log('更新成功:', updatedUser);
      setUsers((prev) =>
        prev.map((user) =>
          user.id === updatedUser.id
            ? {
                ...user,
                ...updatedUser,
                totalPurchases: user.totalPurchases,
                totalAmount: user.totalAmount,
                pendingCount: user.pendingCount,
              }
            : user
        )
      );
    } catch (err) {
      console.error('handleMaxLimitChange 错误:', err);
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setUpdatingId(null);
      setEditingMaxLimitId(null);
    }
  };

  const handleApprovalLimitChange = async (id: string, newApprovalLimit: number | null) => {
    console.log('handleApprovalLimitChange', { id, newApprovalLimit });
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/users`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ id, approvalLimit: newApprovalLimit }),
      });
      console.log('响应状态:', res.status, res.ok);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('更新审批额度失败:', errorText);
        throw new Error(`更新审批额度失败: ${res.status} ${errorText}`);
      }
      const updatedUser = await res.json();
      console.log('更新成功:', updatedUser);
      setUsers((prev) =>
        prev.map((user) =>
          user.id === updatedUser.id
            ? {
                ...user,
                ...updatedUser,
                totalPurchases: user.totalPurchases,
                totalAmount: user.totalAmount,
                pendingCount: user.pendingCount,
              }
            : user
        )
      );
    } catch (err) {
      console.error('handleApprovalLimitChange 错误:', err);
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setUpdatingId(null);
      setEditingApprovalLimitId(null);
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
              审批额度 (¥)
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              申请数
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              总金额
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              待审批
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              注册时间
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
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
                      <option value="GROUP_LEADER">组长</option>
                    </select>
                  </div>
                ) : (
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === Role.ADMIN
                        ? "bg-purple-100 text-purple-800"
                        : user.role === Role.GROUP_LEADER
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {user.role === Role.ADMIN ? "管理员" : user.role === Role.GROUP_LEADER ? "组长" : "用户"}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingMaxLimitId === user.id ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tempMaxLimit}
                      onChange={(e) => setTempMaxLimit(e.target.value)}
                      className="border rounded px-2 py-1 text-sm w-32"
                      placeholder="无限制"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        const numValue = tempMaxLimit === "" ? null : parseFloat(tempMaxLimit);
                        handleMaxLimitChange(user.id, numValue);
                        setEditingMaxLimitId(null);
                      }}
                      className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      disabled={updatingId === user.id}
                    >
                      {updatingId === user.id ? "保存中..." : "保存"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingMaxLimitId(null);
                        setTempMaxLimit("");
                      }}
                      className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => {
                        handleMaxLimitChange(user.id, null);
                        setEditingMaxLimitId(null);
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      清除
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-900">
                      {user.maxLimit ? `¥${user.maxLimit.toFixed(2)}` : "无限制"}
                    </span>
                    <button
                      onClick={() => {
                        setEditingMaxLimitId(user.id);
                        setTempMaxLimit(user.maxLimit?.toString() ?? "");
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-900"
                    >
                      编辑
                    </button>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingApprovalLimitId === user.id ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tempApprovalLimit}
                      onChange={(e) => setTempApprovalLimit(e.target.value)}
                      className="border rounded px-2 py-1 text-sm w-32"
                      placeholder="无限制"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        const numValue = tempApprovalLimit === "" ? null : parseFloat(tempApprovalLimit);
                        handleApprovalLimitChange(user.id, numValue);
                        setEditingApprovalLimitId(null);
                      }}
                      className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      disabled={updatingId === user.id}
                    >
                      {updatingId === user.id ? "保存中..." : "保存"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingApprovalLimitId(null);
                        setTempApprovalLimit("");
                      }}
                      className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => {
                        handleApprovalLimitChange(user.id, null);
                        setEditingApprovalLimitId(null);
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      清除
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-900">
                      {user.approvalLimit ? `¥${user.approvalLimit.toFixed(2)}` : "无限制"}
                    </span>
                    <button
                      onClick={() => {
                        setEditingApprovalLimitId(user.id);
                        setTempApprovalLimit(user.approvalLimit?.toString() ?? "");
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-900"
                    >
                      编辑
                    </button>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                {user.totalPurchases ?? 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ¥{user.totalAmount?.toFixed(2) ?? '0.00'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                {user.pendingCount ?? 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(user.createdAt).toLocaleDateString("zh-CN")}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={() => window.location.href = `/profile?userId=${user.id}`}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  个人信息
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}