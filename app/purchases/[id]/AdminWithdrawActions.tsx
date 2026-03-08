"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AdminWithdrawActionsProps {
  purchaseId: string;
}

export default function AdminWithdrawActions({ purchaseId }: AdminWithdrawActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: "approve" | "reject") => {
    const message = action === "approve" ? "确定批准撤回此采购吗？" : "确定拒绝撤回申请吗？";
    if (!confirm(message)) return;
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/purchases/${purchaseId}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "操作失败");
      }
      alert(`撤回申请已${action === "approve" ? "批准" : "拒绝"}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => handleAction("approve")}
        disabled={loading === "approve"}
        className="block w-full text-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading === "approve" ? "批准中..." : "批准撤回"}
      </button>
      <button
        onClick={() => handleAction("reject")}
        disabled={loading === "reject"}
        className="block w-full text-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading === "reject" ? "拒绝中..." : "拒绝撤回"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}