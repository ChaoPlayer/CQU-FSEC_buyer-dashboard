"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SeasonSettlement {
  id: string;
  seasonName: string;
  status: "NOT_STARTED" | "LEADER_CONFIRMATION" | "COMPLETED";
  startedBy: {
    realName: string | null;
    email: string;
  };
  createdAt: string;
  completedAt: string | null;
}

export default function SeasonSettlementPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [activeSettlement, setActiveSettlement] = useState<SeasonSettlement | null>(null);
  const [settlements, setSettlements] = useState<SeasonSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [seasonName, setSeasonName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
    }
    if (sessionStatus === "authenticated" && session.user.role !== "ADMIN") {
      router.push("/dashboard");
    }
    if (sessionStatus === "authenticated") {
      fetchData();
    }
  }, [sessionStatus, session]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/season-settlements");
      if (!res.ok) throw new Error("获取数据失败");
      const data = await res.json();
      setSettlements(data);
      // 查找活跃的结算
      const active = data.find((s: SeasonSettlement) => s.status !== "COMPLETED");
      setActiveSettlement(active || null);
    } catch (err) {
      console.error(err);
      setError("加载赛季结算数据失败");
    } finally {
      setLoading(false);
    }
  };

  const handleStartSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    setStarting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/season-settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonName, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "启动失败");
      }
      setSuccess("赛季结算已启动，已通知所有组长");
      setSeasonName("");
      setPassword("");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleAdvanceStatus = async (settlementId: string, targetStatus: "LEADER_CONFIRMATION" | "COMPLETED") => {
    if (!confirm(`确定要推进到${targetStatus === "LEADER_CONFIRMATION" ? "组长确认阶段" : "完成阶段"}吗？`)) return;
    try {
      const res = await fetch(`/api/season-settlements/${settlementId}/advance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStatus }),
      });
      if (!res.ok) throw new Error("操作失败");
      setSuccess("状态已更新");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">赛季结算管理</h1>
          <p className="mt-2 text-gray-600">
            启动赛季结算流程，锁定所有进度树版本，供各组长确认保留的版本，最终完成赛季归档。
          </p>
        </div>
        <div className="text-sm text-gray-500">
          管理员：{session?.user?.name || session?.user?.email}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {activeSettlement ? (
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">当前赛季结算</h2>
              <div className="mt-2 space-y-1">
                <p><span className="font-medium">赛季名称：</span>{activeSettlement.seasonName}</p>
                <p><span className="font-medium">状态：</span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${activeSettlement.status === "NOT_STARTED" ? "bg-yellow-100 text-yellow-800" :
                    activeSettlement.status === "LEADER_CONFIRMATION" ? "bg-blue-100 text-blue-800" :
                      "bg-green-100 text-green-800"
                    }`}>
                    {activeSettlement.status === "NOT_STARTED" && "未开始"}
                    {activeSettlement.status === "LEADER_CONFIRMATION" && "组长确认中"}
                    {activeSettlement.status === "COMPLETED" && "已完成"}
                  </span>
                </p>
                <p><span className="font-medium">创建人：</span>{activeSettlement.startedBy.realName || activeSettlement.startedBy.email}</p>
                <p><span className="font-medium">创建时间：</span>{new Date(activeSettlement.createdAt).toLocaleString("zh-CN")}</p>
              </div>
            </div>
            <div className="space-x-3">
              {activeSettlement.status === "NOT_STARTED" && (
                <button
                  onClick={() => handleAdvanceStatus(activeSettlement.id, "LEADER_CONFIRMATION")}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  进入组长确认阶段
                </button>
              )}
              {activeSettlement.status === "LEADER_CONFIRMATION" && (
                <button
                  onClick={() => handleAdvanceStatus(activeSettlement.id, "COMPLETED")}
                  className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  完成赛季结算
                </button>
              )}
            </div>
          </div>
          <div className="mt-6">
            <p className="text-sm text-gray-500">
              {activeSettlement.status === "NOT_STARTED" && "赛季结算已启动，所有进度树版本已被锁定，等待组长确认。"}
              {activeSettlement.status === "LEADER_CONFIRMATION" && "各组长正在确认本组需要保留的版本，确认完成后可进入完成阶段。"}
              {activeSettlement.status === "COMPLETED" && "赛季结算已完成，未保留的版本已被归档。"}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">暂无进行中的赛季结算</h2>
            <p className="mt-2 text-gray-600">您可以启动一个新的赛季结算流程，锁定所有进度树版本，供组长确认。</p>
            <div className="mt-6 max-w-md mx-auto">
              <form onSubmit={handleStartSettlement} className="space-y-4">
                <div>
                  <label htmlFor="seasonName" className="block text-sm font-medium text-gray-700">
                    赛季名称 *
                  </label>
                  <input
                    type="text"
                    id="seasonName"
                    value={seasonName}
                    onChange={(e) => setSeasonName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例如：2025赛季"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    管理员密码 *
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="输入管理员密码以确认"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">密码验证防止误操作</p>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={starting}
                    className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {starting ? "启动中..." : "启动赛季结算"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">历史赛季结算</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">赛季名称</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建人</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">完成时间</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {settlements.map((settlement) => (
                <tr key={settlement.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{settlement.seasonName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${settlement.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                      settlement.status === "LEADER_CONFIRMATION" ? "bg-blue-100 text-blue-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                      {settlement.status === "NOT_STARTED" && "未开始"}
                      {settlement.status === "LEADER_CONFIRMATION" && "组长确认中"}
                      {settlement.status === "COMPLETED" && "已完成"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{settlement.startedBy.realName || settlement.startedBy.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(settlement.createdAt).toLocaleString("zh-CN")}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {settlement.completedAt ? new Date(settlement.completedAt).toLocaleString("zh-CN") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-gray-500 border-t pt-4">
        <p>赛季结算流程：</p>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li><strong>启动结算</strong>：管理员输入密码启动，系统锁定所有进度树版本，禁止新提交和合并。</li>
          <li><strong>组长确认</strong>：各组长登录系统，确认本组需要保留的版本（标记 seasonKept=true）。</li>
          <li><strong>完成结算</strong>：管理员确认所有组长已完成确认，系统将未保留的版本归档，赛季结算完成。</li>
        </ol>
      </div>
    </div>
  );
}