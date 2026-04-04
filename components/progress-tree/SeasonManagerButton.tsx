"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface SeasonSettlement {
  id: string;
  seasonName: string;
  status: "NOT_STARTED" | "LEADER_CONFIRMATION" | "COMPLETED";
  createdAt: string;
  completedAt: string | null;
  startedBy: { realName: string | null; email: string };
}

interface Props {
  currentSeasonName: string;
}

const CONFIRM_COUNTDOWN = 5; // 秒

export default function SeasonManagerButton({ currentSeasonName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"settlement" | "history">("settlement");

  const [settlements, setSettlements] = useState<SeasonSettlement[]>([]);
  const [activeSettlement, setActiveSettlement] = useState<SeasonSettlement | null>(null);
  const [loading, setLoading] = useState(false);

  // 赛季结算表单
  const [seasonName, setSeasonName] = useState("");
  const [password, setPassword] = useState("");
  const [settling, setSettling] = useState(false);
  const [settlementMsg, setSettlementMsg] = useState("");
  const [settlementError, setSettlementError] = useState("");

  // 二次确认弹窗
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [countdown, setCountdown] = useState(CONFIRM_COUNTDOWN);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 待提交的数据（验证密码通过后暂存）
  const pendingSubmitRef = useRef<{ seasonName: string; password: string } | null>(null);

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/season-settlements");
      if (!res.ok) return;
      const data: SeasonSettlement[] = await res.json();
      setSettlements(data);
      const active = data.find((s) => s.status !== "COMPLETED");
      setActiveSettlement(active ?? null);
    } catch (_) {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchSettlements();
  }, [open, fetchSettlements]);

  // 清除倒计时
  const clearCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  // 打开确认弹窗并启动倒计时
  const openConfirm = () => {
    setCountdown(CONFIRM_COUNTDOWN);
    setConfirmOpen(true);
    clearCountdown();
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const closeConfirm = () => {
    clearCountdown();
    setConfirmOpen(false);
    pendingSubmitRef.current = null;
  };

  // 组件卸载清除
  useEffect(() => () => clearCountdown(), []);

  const handleOpen = () => {
    setOpen(true);
    setTab("settlement");
    setSettlementMsg("");
    setSettlementError("");
  };

  /* -------- 第一步：验证输入，弹确认窗 -------- */
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonName.trim()) {
      setSettlementError("请填写赛季名称");
      return;
    }
    if (!password.trim()) {
      setSettlementError("请填写管理员密码");
      return;
    }
    setSettlementError("");
    pendingSubmitRef.current = { seasonName, password };
    openConfirm();
  };

  /* -------- 第二步：确认后真正提交 -------- */
  const handleConfirmSettlement = async () => {
    if (!pendingSubmitRef.current) return;
    const { seasonName: sn, password: pw } = pendingSubmitRef.current;
    closeConfirm();
    setSettling(true);
    setSettlementMsg("");
    setSettlementError("");
    try {
      const res = await fetch("/api/season-settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonName: sn, password: pw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "启动失败");
      setSettlementMsg("赛季结算已启动，已通知所有组长");
      setSeasonName("");
      setPassword("");
      fetchSettlements();
    } catch (err: any) {
      setSettlementError(err.message);
    } finally {
      setSettling(false);
    }
  };

  const handleAdvanceStatus = async (
    id: string,
    targetStatus: "LEADER_CONFIRMATION" | "COMPLETED"
  ) => {
    const label =
      targetStatus === "LEADER_CONFIRMATION" ? "组长确认阶段" : "完成阶段";
    if (!confirm(`确定要推进到${label}吗？`)) return;
    try {
      const res = await fetch(`/api/season-settlements/${id}/advance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStatus }),
      });
      if (!res.ok) throw new Error("操作失败");
      setSettlementMsg("状态已更新");
      fetchSettlements();
    } catch (err: any) {
      setSettlementError(err.message);
    }
  };

  /* -------- 切换历史赛季 -------- */
  const handleSwitchSeason = (settlement: SeasonSettlement) => {
    router.push(
      `/dashboard/progress-trees?season=${encodeURIComponent(settlement.seasonName)}`
    );
    setOpen(false);
  };

  const statusLabel = (s: string) =>
    s === "NOT_STARTED"
      ? "未开始"
      : s === "LEADER_CONFIRMATION"
      ? "组长确认中"
      : "已完成";
  const statusColor = (s: string) =>
    s === "COMPLETED"
      ? "bg-green-100 text-green-800"
      : s === "LEADER_CONFIRMATION"
      ? "bg-blue-100 text-blue-800"
      : "bg-yellow-100 text-yellow-800";

  return (
    <>
      {/* 触发按钮：低调文字+下划线 */}
      <button
        onClick={handleOpen}
        className="ml-2 text-sm text-gray-400 underline underline-offset-2 hover:text-gray-600 transition-colors font-normal"
      >
        切换赛季
      </button>

      {/* 主弹窗 */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">赛季管理</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Tab 导航 */}
            <div className="flex border-b border-gray-100 px-6">
              {(
                [
                  { key: "settlement", label: "开启赛季结算" },
                  { key: "history", label: "切换历史赛季" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`py-3 mr-6 text-sm font-medium border-b-2 transition-colors ${
                    tab === key
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 内容区 */}
            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
              {/* --- 开启赛季结算 --- */}
              {tab === "settlement" && (
                <div className="space-y-4">
                  {settlementMsg && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">
                      {settlementMsg}
                    </div>
                  )}
                  {settlementError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                      {settlementError}
                    </div>
                  )}

                  {activeSettlement ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">当前有进行中的赛季结算：</p>
                      <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                        <p>
                          <span className="font-medium">赛季：</span>
                          {activeSettlement.seasonName}
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="font-medium">状态：</span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(activeSettlement.status)}`}
                          >
                            {statusLabel(activeSettlement.status)}
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-3">
                        {activeSettlement.status === "NOT_STARTED" && (
                          <button
                            onClick={() =>
                              handleAdvanceStatus(activeSettlement.id, "LEADER_CONFIRMATION")
                            }
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                          >
                            进入组长确认阶段
                          </button>
                        )}
                        {activeSettlement.status === "LEADER_CONFIRMATION" && (
                          <button
                            onClick={() =>
                              handleAdvanceStatus(activeSettlement.id, "COMPLETED")
                            }
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                          >
                            完成赛季结算
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* 启动新赛季结算表单 */
                    <form onSubmit={handleSubmitForm} className="space-y-3" autoComplete="off">
                      <p className="text-sm text-gray-500">
                        启动赛季结算后，系统将锁定所有进度树版本，供各组长确认保留。
                      </p>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          赛季名称 *
                        </label>
                        <input
                          type="text"
                          value={seasonName}
                          onChange={(e) => setSeasonName(e.target.value)}
                          autoComplete="off"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="例如：2026赛季"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          管理员密码 *
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="new-password"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="输入密码以防误操作"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={settling}
                        className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {settling ? "启动中…" : "下一步"}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* --- 切换历史赛季 --- */}
              {tab === "history" && (
                <div className="space-y-3">
                  {loading ? (
                    <p className="text-sm text-gray-400 text-center py-4">加载中…</p>
                  ) : settlements.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">暂无历史赛季记录</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {settlements.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800">{s.seasonName}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(s.createdAt).toLocaleDateString("zh-CN")}
                              {s.completedAt &&
                                ` → ${new Date(s.completedAt).toLocaleDateString("zh-CN")}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(s.status)}`}
                            >
                              {statusLabel(s.status)}
                            </span>
                            <button
                              onClick={() => handleSwitchSeason(s)}
                              className="text-sm text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
                            >
                              切换
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 二次确认弹窗（z-60，叠在主弹窗上） */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            {/* 警告头部 */}
            <div className="bg-red-50 px-6 py-5 border-b border-red-100">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <h3 className="text-base font-semibold text-red-800">
                  确认开启赛季结算？
                </h3>
              </div>
            </div>
            {/* 说明 */}
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                开启赛季结算后，以下操作将被<strong>立即封锁</strong>：
              </p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                <li>禁止向当前进度树提交新版本</li>
                <li>禁止合并任何待审核版本</li>
                <li>所有进度树进入只读模式</li>
              </ul>
              <p className="text-sm text-gray-500">
                此操作不可撤销，各组长将收到通知并需要确认保留的版本。
              </p>
            </div>
            {/* 操作按钮 */}
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={closeConfirm}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleConfirmSettlement}
                disabled={countdown > 0}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
              >
                {countdown > 0
                  ? `确认开启（${countdown}s）`
                  : "确认开启"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
