"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface MergeActionsProps {
  version: {
    id: string;
    fileName: string | null;
    submitter: {
      id: string;
      realName: string | null;
    };
  };
}

export default function MergeActions({ version }: MergeActionsProps) {
  const router = useRouter();
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [hours, setHours] = useState(1);
  const [reason, setReason] = useState("");
  // 增加新版本名称和描述状态
  const [newVersionName, setNewVersionName] = useState("");
  const [newVersionDesc, setNewVersionDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMerge = async () => {
    if (hours < 0) {
      setError("工时必须为非负数");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tree-versions/${version.id}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "approve", 
          hours, 
          description: reason || null,
          newVersionName: newVersionName || null,
          newVersionDesc: newVersionDesc || null
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "合并失败");
      }
      setShowMergeModal(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "合并过程中发生错误");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      setError("请填写驳回理由");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tree-versions/${version.id}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionReason: reason }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "驳回失败");
      }
      setShowRejectModal(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "驳回过程中发生错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={() => setShowMergeModal(true)}
          className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-xs font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          合并
        </button>
        <button
          type="button"
          onClick={() => setShowRejectModal(true)}
          className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-xs font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <XCircleIcon className="w-3 h-3 mr-1" />
          驳回
        </button>
      </div>

      {/* 合并模态框 */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-600/75 z-40 transition-opacity"
            onClick={() => setShowMergeModal(false)}
          />
          {/* Modal content */}
          <div className="relative z-50 bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">合并分支版本</h3>
            <p className="text-sm text-gray-600 mb-4">
              将分支 <strong>{version.fileName}</strong> 合并到主线，并为提交者 <strong>{version.submitter.realName}</strong> 发放工时。这将创建一个新的主线版本。
            </p>
            <div className="mb-4">
              <label htmlFor="newVersionName" className="block text-sm font-medium text-gray-700 mb-1">
                新主线版本名称（可选）
              </label>
              <input
                type="text"
                id="newVersionName"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                placeholder="例如：主底盘合体"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="newVersionDesc" className="block text-sm font-medium text-gray-700 mb-1">
                新版本描述（可选）
              </label>
              <textarea
                id="newVersionDesc"
                rows={2}
                value={newVersionDesc}
                onChange={(e) => setNewVersionDesc(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                placeholder="填写合并后的版本说明"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="hours" className="block text-sm font-medium text-gray-700 mb-1">
                发放工时（小时）
              </label>
              <input
                type="number"
                id="hours"
                min="0"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
              />
            </div>
            <div className="mb-6">
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                备注（可选）
              </label>
              <textarea
                id="reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                placeholder="可填写合并说明"
              />
            </div>
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleMerge}
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading ? "处理中..." : "确认合并"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 驳回模态框 */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-600/75 z-40 transition-opacity"
            onClick={() => setShowRejectModal(false)}
          />
          {/* Modal content */}
          <div className="relative z-50 bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">驳回分支版本</h3>
            <p className="text-sm text-gray-600 mb-4">
              确定要驳回分支 <strong>{version.fileName}</strong> 吗？提交者 <strong>{version.submitter.realName}</strong> 将收到驳回通知。
            </p>
            <div className="mb-6">
              <label htmlFor="rejectReason" className="block text-sm font-medium text-gray-700 mb-1">
                驳回理由 *
              </label>
              <textarea
                id="rejectReason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                placeholder="请详细说明驳回原因，以便提交者改进"
                required
              />
            </div>
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {loading ? "处理中..." : "确认驳回"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}