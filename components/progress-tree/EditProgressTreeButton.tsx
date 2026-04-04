"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EditProgressTreeButtonProps {
  treeId: string;
  treeName: string;
  treeDescription?: string | null;
  treeStatus?: string;
}

export default function EditProgressTreeButton({
  treeId,
  treeName,
  treeDescription,
  treeStatus = "ACTIVE",
}: EditProgressTreeButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(treeName);
  const [description, setDescription] = useState(treeDescription ?? "");
  const [status, setStatus] = useState(treeStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleOpen = () => {
    // 重置表单为当前值
    setName(treeName);
    setDescription(treeDescription ?? "");
    setStatus(treeStatus);
    setError(null);
    setSuccessMsg(null);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("请输入进度树名称");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await fetch(`/api/progress-trees/${treeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          status,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "更新失败");
      }
      setSuccessMsg("✓ 保存成功");
      router.refresh();
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMsg(null);
      }, 800);
    } catch (err: any) {
      setError(err.message || "未知错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
      >
        编辑
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-600/75 z-40 transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          {/* Modal content */}
          <div className="relative z-50 bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg font-medium leading-6 text-gray-900">编辑进度树</h3>
                <div className="mt-4">
                  <form onSubmit={handleSubmit}>
                    {/* 名称 */}
                    <div className="mb-4">
                      <label htmlFor="edit-tree-name" className="block text-sm font-medium text-gray-700">
                        进度树名称 *
                      </label>
                      <input
                        type="text"
                        id="edit-tree-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                        placeholder="例如：2025赛季动力总成进度树"
                        required
                        disabled={loading}
                      />
                    </div>

                    {/* 描述 */}
                    <div className="mb-4">
                      <label htmlFor="edit-tree-description" className="block text-sm font-medium text-gray-700">
                        描述（可选）
                      </label>
                      <textarea
                        id="edit-tree-description"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                        placeholder="简要描述此进度树的用途"
                        disabled={loading}
                      />
                    </div>

                    {/* 状态 */}
                    <div className="mb-6">
                      <label htmlFor="edit-tree-status" className="block text-sm font-medium text-gray-700">
                        状态
                      </label>
                      <select
                        id="edit-tree-status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                        disabled={loading}
                      >
                        <option value="ACTIVE">活跃</option>
                        <option value="ARCHIVED">已归档</option>
                      </select>
                    </div>

                    {/* 错误/成功提示 */}
                    {error && (
                      <div className="mb-4 rounded-md bg-red-50 p-3">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}
                    {successMsg && (
                      <div className="mb-4 rounded-md bg-green-50 p-3">
                        <p className="text-sm text-green-800">{successMsg}</p>
                      </div>
                    )}

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={loading}
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {loading ? "保存中..." : "保存"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
