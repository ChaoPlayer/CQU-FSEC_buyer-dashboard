"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AdminActionsProps {
  purchase: {
    id: string;
    status: string;
    rejectionReason?: string | null;
  };
}

export default function AdminActions({ purchase }: AdminActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRejectionInput, setShowRejectionInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState(purchase.rejectionReason || "");

  const handleApprove = async () => {
    if (!confirm("确定批准此采购申请吗？")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/purchases/${purchase.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "批准失败");
      }
      router.refresh();
      alert("采购申请已批准");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError("请填写拒绝理由");
      return;
    }
    if (!confirm("确定拒绝此采购申请吗？")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/purchases/${purchase.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", rejectionReason: rejectionReason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "拒绝失败");
      }
      router.refresh();
      alert("采购申请已拒绝");
      setShowRejectionInput(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRejectionReason = async () => {
    if (!rejectionReason.trim()) {
      setError("拒绝理由不能为空");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/purchases/${purchase.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "更新拒绝理由失败");
      }
      router.refresh();
      alert("拒绝理由已更新");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* 批准按钮 */}
      <button
        onClick={handleApprove}
        disabled={loading || purchase.status === "APPROVED"}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "处理中..." : "批准申请"}
      </button>

      {/* 拒绝按钮和理由输入 */}
      <div className="space-y-3">
        <button
          onClick={() => setShowRejectionInput(!showRejectionInput)}
          disabled={loading || purchase.status === "APPROVED"}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {showRejectionInput ? "取消拒绝" : "拒绝申请"}
        </button>

        {(showRejectionInput || purchase.status === "REJECTED") && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">拒绝理由</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="请输入拒绝理由..."
            />
            <div className="flex space-x-2">
              {purchase.status === "REJECTED" ? (
                <>
                  <button
                    onClick={handleUpdateRejectionReason}
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? "更新中..." : "更新拒绝理由"}
                  </button>
                  <button
                    onClick={() => setShowRejectionInput(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    取消
                  </button>
                </>
              ) : (
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 disabled:opacity-50"
                >
                  {loading ? "提交中..." : "提交拒绝"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 当前拒绝理由显示 */}
        {purchase.status === "REJECTED" && purchase.rejectionReason && !showRejectionInput && (
          <div className="mt-3 p-3 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-700">当前拒绝理由：</p>
            <p className="text-sm text-gray-600 mt-1">{purchase.rejectionReason}</p>
          </div>
        )}
      </div>

      {/* 撤回申请处理（保留原有逻辑） */}
      {purchase.status === "WITHDRAWAL_REQUESTED" && (
        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600">此采购正在申请撤回，请处理撤回请求。</p>
        </div>
      )}
    </div>
  );
}