"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SeasonKeptButtonProps {
  versionId: string;
  initialKept: boolean;
  /** 是否在活跃赛季结算的组长确认阶段 */
  inLeaderConfirmation: boolean;
}

export default function SeasonKeptButton({
  versionId,
  initialKept,
  inLeaderConfirmation,
}: SeasonKeptButtonProps) {
  const router = useRouter();
  const [kept, setKept] = useState(initialKept);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!inLeaderConfirmation) return null;

  const handleToggle = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tree-versions/${versionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "season_kept", seasonKept: !kept }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "操作失败");
      setKept(!kept);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 ${
          kept
            ? "bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200"
            : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
        }`}
        title={kept ? "已标记保留（点击取消）" : "标记为赛季保留"}
      >
        {loading ? (
          <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : kept ? (
          <span>⭐</span>
        ) : (
          <span>☆</span>
        )}
        {kept ? "赛季保留" : "标记保留"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
