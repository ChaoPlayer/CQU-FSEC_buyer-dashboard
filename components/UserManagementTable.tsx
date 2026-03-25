"use client";

import { useState, useEffect } from "react";
import { Role } from "@prisma/client";

interface InviteCode {
  id: string;
  code: string;
  isUsed: boolean;
  usedById: string | null;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
  realName: string | null;
  role: Role;
  group: string | null;
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

  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingInviteCodes, setLoadingInviteCodes] = useState(false);

  // 批量导入相关状态
  const [batchImportModalOpen, setBatchImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);

  const PRESET_GROUPS = [
    '车架组',
    '动力组',
    '电控组',
    '无人驾驶组',
    '悬挂组',
    '运营组',
    '商务组',
  ];

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

  const fetchInviteCodes = async () => {
    setLoadingInviteCodes(true);
    try {
      const res = await fetch("/api/admin/invite-codes", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("获取邀请码失败");
      const data = await res.json();
      setInviteCodes(data);
      setModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取邀请码失败");
    } finally {
      setLoadingInviteCodes(false);
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

  const handleGroupChange = async (id: string, newGroup: string | null) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/group`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ group: newGroup }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`更新组别失败: ${res.status} ${errorText}`);
      }
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
      console.error('handleGroupChange 错误:', err);
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setUpdatingId(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // 显示成功提示
      alert('邀请码已复制到剪贴板');
    } catch (err) {
      console.error('复制失败:', err);
      alert('复制失败，请手动复制');
    }
  };

  const handleBatchImport = async () => {
    if (!importFile) {
      alert('请先选择Excel文件');
      return;
    }
    setImportLoading(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', importFile);
    try {
      const res = await fetch('/api/admin/users/batch-pre-register', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '导入失败');
      }
      setImportResult(data);
      // 刷新用户列表
      fetchUsers();
      // 清空文件
      setImportFile(null);
    } catch (err) {
      console.error('批量导入失败:', err);
      alert(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImportLoading(false);
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
    <>
    <div className="mb-6 flex items-center space-x-4">
      <button
        onClick={fetchInviteCodes}
        disabled={loadingInviteCodes}
        className="inline-flex items-center px-4 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loadingInviteCodes ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
            加载中...
          </>
        ) : (
          <>
            <span className="mr-2">🔑</span>
            获取注册邀请码
          </>
        )}
      </button>
      <button
        onClick={() => setBatchImportModalOpen(true)}
        className="inline-flex items-center px-4 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
      >
        <span className="mr-2">📥</span>
        批量导入名单
      </button>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full border-none">
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
              组别
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
        <tbody>
          {users.map((user, index) => (
            <tr key={user.id} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100`}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {user.email}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {user.realName || "—"}
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
                <select
                  value={user.group ?? ''}
                  onChange={(e) => handleGroupChange(user.id, e.target.value || null)}
                  disabled={updatingId === user.id}
                  className="border rounded px-2 py-1 text-sm w-32"
                >
                  <option value="">未分配</option>
                  {PRESET_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
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
    {/* 模态框 */}
    {modalOpen && (
      <div className="fixed inset-0 bg-black/60 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
        <div className="relative bg-white p-8 rounded-lg shadow-2xl max-w-2xl w-full mx-4">
          <div className="pb-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                <span className="mr-2">🔑</span>
                当前有效注册邀请码
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            <p className="text-gray-600 text-sm">
              (管理员提示：以下邀请码在对应用户注册后将自动失效并更新)
            </p>
          </div>
          <div className="space-y-4">
            {inviteCodes.map((invite) => (
              <div
               key={invite.id}
               className="flex items-center justify-between py-5 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
             >
                <div className="flex items-center space-x-4">
                  <div className="text-xl font-mono font-bold text-gray-900 tracking-wide">
                    {invite.code}
                  </div>
                  <div className={`text-sm px-2 py-1 rounded-full ${invite.isUsed ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {invite.isUsed ? "已使用" : "未使用"}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(invite.code)}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <span className="mr-2">📋</span>
                  复制
                </button>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 bg-gray-50 rounded-b-lg -mx-8 -mb-8 px-8 py-6">
            <div className="flex justify-between">
              <button
                onClick={() => setModalOpen(false)}
                className="px-6 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
              >
                取消
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    {/* 批量导入模态框 */}
    {batchImportModalOpen && (
      <div className="fixed inset-0 bg-black/60 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
        <div className="relative bg-white p-8 rounded-lg shadow-2xl max-w-2xl w-full mx-4">
          <div className="pb-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                <span className="mr-2">📥</span>
                车队成员 Excel 批量导入
              </h3>
              <button
                onClick={() => {
                  setBatchImportModalOpen(false);
                  setImportFile(null);
                  setImportResult(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            <p className="text-gray-600 text-sm">
              (仅支持 .xlsx 或 .xls 格式，请确保表头包含“姓名”、“学号”、“组别”列)
            </p>
          </div>
          <div className="space-y-6">
            {/* 文件上传区域 */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                importFile
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <input
                type="file"
                id="fileInput"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImportFile(file);
                  setImportResult(null);
                }}
              />
              <div className="flex flex-col items-center">
                <div className="text-4xl mb-2">📄</div>
                <div className="text-lg font-medium text-gray-900">
                  {importFile ? importFile.name : '点击或拖拽文件到此处'}
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  支持 .xlsx 或 .xls 文件，最大 10MB
                </div>
                {importFile && (
                  <div className="mt-4 text-sm text-blue-600">
                    ✅ 已选择文件，点击下方“开始导入”按钮进行上传
                  </div>
                )}
              </div>
            </div>

            {/* 导入结果 */}
            {importResult && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">导入结果</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>成功导入人数：</span>
                    <span className="font-bold text-green-600">{importResult.imported}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>跳过人数（已存在）：</span>
                    <span className="font-bold text-amber-600">{importResult.skipped}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 加载状态 */}
            {importLoading && (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-700">正在解析并导入数据，请稍候...</span>
              </div>
            )}
          </div>
          <div className="mt-8 pt-6 bg-gray-50 rounded-b-lg -mx-8 -mb-8 px-8 py-6">
            <div className="flex justify-between">
              <button
                onClick={() => {
                  setBatchImportModalOpen(false);
                  setImportFile(null);
                  setImportResult(null);
                }}
                className="px-6 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
              >
                取消
              </button>
              <button
                onClick={handleBatchImport}
                disabled={!importFile || importLoading}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importLoading ? '导入中...' : '开始导入'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}