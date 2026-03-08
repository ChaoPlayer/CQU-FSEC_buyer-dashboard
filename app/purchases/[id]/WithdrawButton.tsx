"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface WithdrawButtonProps {
  purchaseId: string;
  disabled?: boolean;
}

export default function WithdrawButton({ purchaseId, disabled }: WithdrawButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWithdraw = async () => {
    if (!confirm("确定要申请撤回此采购吗？撤回后需要管理员批准。")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/purchases/${purchaseId}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "撤回申请失败");
      }
      alert("撤回申请已提交，等待管理员审批");
      router.refresh(); // 刷新页面以更新状态
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleWithdraw}
        disabled={loading || disabled}
        className="text-red-600 hover:text-red-900 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "提交中..." : "申请撤回"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}