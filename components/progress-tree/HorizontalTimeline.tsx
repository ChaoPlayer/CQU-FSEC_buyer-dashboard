"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { VersionType, VersionStatus } from "@prisma/client";

type VersionWithSubmitter = {
  id: string;
  type: VersionType;
  status: VersionStatus;
  versionNumber: number | null;
  fileName: string | null;
  description: string;
  name: string | null;
  parentVersionId: string | null;
  createdAt: Date | string;
  mergedAt: Date | string | null;
  note?: string | null;
  submitter: { id: string; realName: string | null; email: string };
};

interface HorizontalTimelineProps {
  treeId: string;
  versions: VersionWithSubmitter[];
  canEdit?: boolean; // 管理员或进度树创建者
  externalEditMode?: boolean; // 由父组件控制的编辑模式（卡片内联编辑）
}

// ── 布局常量 ────────────────────────────────────────
const MAIN_Y = 72;
const MAIN_R = 9;
const MAIN_R_LATEST = 11;
const BRANCH_BASE_Y = 144;
const BRANCH_R = 6;
const BRANCH_ROW_H = 36;
const RIGHT_PAD = 48;
const LEFT_MARGIN = 60;
// ────────────────────────────────────────────────────

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}
function formatFull(date: Date | string) {
  return new Date(date).toLocaleString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── 节点编辑弹窗 ────────────────────────────────────
interface NodeEditPopupProps {
  version: VersionWithSubmitter;
  pos: { x: number; y: number };
  onClose: () => void;
  onRefresh: () => void;
}
function NodeEditPopup({ version, pos, onClose, onRefresh }: NodeEditPopupProps) {
  const [noteInput, setNoteInput] = useState(version.note ?? "");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteMsg, setNoteMsg] = useState("");
  const [operating, setOperating] = useState(false);
  const [opMsg, setOpMsg] = useState("");
  const [opError, setOpError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // 限制弹窗不超出视口
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const W = 280;
  const left = Math.min(pos.x + 12, vw - W - 8);
  const top = Math.min(pos.y + 12, vh - 300);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const saveNote = async () => {
    setNoteSaving(true);
    setNoteMsg("");
    try {
      const res = await fetch(`/api/tree-versions/${version.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "note", note: noteInput.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setNoteMsg("✓ 备注已保存");
      onRefresh();
    } catch (e: any) { setNoteMsg("❌ " + e.message); }
    finally { setNoteSaving(false); }
  };

  const revertMerge = async () => {
    if (!confirm("确定要撤回该分支的合并？相关主线版本将被删除，该版本将回到待审核状态。")) return;
    setOperating(true); setOpMsg(""); setOpError("");
    try {
      const res = await fetch(`/api/tree-versions/${version.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revert_merge" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setOpMsg("✓ " + data.message);
      onRefresh();
      setTimeout(onClose, 1200);
    } catch (e: any) { setOpError("❌ " + e.message); }
    finally { setOperating(false); }
  };

  const deleteVersion = async () => {
    if (!confirm(`确定要删除版本 V${version.versionNumber}${version.name ? " · " + version.name : ""}？此操作不可撤销。`)) return;
    setOperating(true); setOpMsg(""); setOpError("");
    try {
      const res = await fetch(`/api/tree-versions/${version.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setOpMsg("✓ 版本已删除");
      onRefresh();
      setTimeout(onClose, 1000);
    } catch (e: any) { setOpError("❌ " + e.message); }
    finally { setOperating(false); }
  };

  const isMergedBranch = version.type === VersionType.BRANCH && version.status === VersionStatus.MERGED;

  return (
    <div
      ref={ref}
      className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
      style={{ left, top, width: W }}
    >
      {/* 头部 */}
      <div className={`px-4 py-3 border-b border-gray-100 flex items-center justify-between ${version.type === VersionType.MAIN ? "bg-blue-50" : "bg-yellow-50"}`}>
        <div>
          <span className={`text-xs font-semibold ${version.type === VersionType.MAIN ? "text-blue-700" : "text-yellow-700"}`}>
            {version.type === VersionType.MAIN ? "主线" : "分支"} V{version.versionNumber}
            {version.name ? ` · ${version.name}` : ""}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-base leading-none">×</button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* 备注区 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">📝 节点备注</label>
          <textarea
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            rows={2}
            className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400"
            placeholder="输入备注（显示在 hover 提示中）"
          />
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={saveNote}
              disabled={noteSaving}
              className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {noteSaving ? "保存中…" : "保存备注"}
            </button>
            {noteMsg && <span className="text-xs text-gray-500">{noteMsg}</span>}
          </div>
        </div>

        {/* 分割线 */}
        <div className="border-t border-gray-100" />

        {/* 操作区 */}
        <div className="space-y-2">
          {opMsg && <p className="text-xs text-green-600">{opMsg}</p>}
          {opError && <p className="text-xs text-red-600">{opError}</p>}

          {/* 撤回合并（仅已合并分支） */}
          {isMergedBranch && (
            <button
              onClick={revertMerge}
              disabled={operating}
              className="w-full text-left px-3 py-2 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-100 rounded-lg hover:bg-orange-100 disabled:opacity-50 flex items-center gap-2"
            >
              <span>↩️</span>
              <span>撤回分支合并</span>
            </button>
          )}

          {/* 删除版本 */}
          <button
            onClick={deleteVersion}
            disabled={operating}
            className="w-full text-left px-3 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 disabled:opacity-50 flex items-center gap-2"
          >
            <span>🗑️</span>
            <span>删除此版本</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 主组件 ─────────────────────────────────────────
export default function HorizontalTimeline({ treeId, versions: initialVersions, canEdit = false, externalEditMode }: HorizontalTimelineProps) {
  const router = useRouter();
  const [hoveredVersionId, setHoveredVersionId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(640);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 编辑模式：外部控制优先，否则内部自管理
  const [internalEditMode, setInternalEditMode] = useState(false);
  const editMode = externalEditMode !== undefined ? externalEditMode : internalEditMode;
  const [editPopupVersion, setEditPopupVersion] = useState<VersionWithSubmitter | null>(null);
  const [editPopupPos, setEditPopupPos] = useState({ x: 0, y: 0 });

  const refresh = () => router.refresh();

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setContainerWidth(w);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [containerWidth, initialVersions]);

  const versions = initialVersions;

  if (versions.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
        <p className="text-sm">暂无版本记录</p>
      </div>
    );
  }

  const mainVersions = versions
    .filter((v) => v.type === VersionType.MAIN && v.status === VersionStatus.MERGED)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (mainVersions.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
        <p className="text-sm">暂无主线版本</p>
      </div>
    );
  }

  const branchesByParent: Record<string, VersionWithSubmitter[]> = {};
  const legacyBranches: VersionWithSubmitter[] = [];

  for (const v of versions) {
    if (v.type === VersionType.BRANCH && (v.status === VersionStatus.PENDING || v.status === VersionStatus.MERGED)) {
      const pid = v.parentVersionId;
      if (pid && mainVersions.some(m => m.id === pid)) {
        if (!branchesByParent[pid]) branchesByParent[pid] = [];
        branchesByParent[pid].push(v);
      } else {
        legacyBranches.push(v);
      }
    }
  }

  const legacyByMain: Record<string, VersionWithSubmitter[]> = {};
  for (const branch of legacyBranches) {
    const branchTime = new Date(branch.createdAt).getTime();
    let assignedMain = mainVersions[0];
    for (const m of mainVersions) {
      if (new Date(m.createdAt).getTime() <= branchTime) assignedMain = m;
    }
    if (!legacyByMain[assignedMain.id]) legacyByMain[assignedMain.id] = [];
    legacyByMain[assignedMain.id].push(branch);
  }

  const branchesForMain = (mainId: string): VersionWithSubmitter[] => {
    const all = [...(branchesByParent[mainId] ?? []), ...(legacyByMain[mainId] ?? [])];
    const merged = all
      .filter(v => v.status === VersionStatus.MERGED)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const pending = all
      .filter(v => v.status === VersionStatus.PENDING)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return [...merged, ...pending];
  };

  const maxBranchCount = mainVersions.reduce((max, m) => Math.max(max, branchesForMain(m.id).length), 0);
  const svgHeight = maxBranchCount > 0
    ? BRANCH_BASE_Y + maxBranchCount * BRANCH_ROW_H + 28
    : MAIN_Y + 36;

  const totalMainCols = mainVersions.length;
  const stepWidth = containerWidth * 0.30;
  const anchorX = Math.max(containerWidth * 0.75, LEFT_MARGIN + (totalMainCols - 1) * stepWidth);
  const svgWidth = anchorX + RIGHT_PAD;

  const mainColX = (idx: number) => anchorX - (totalMainCols - 1 - idx) * stepWidth;
  const branchOffsetX = Math.max(stepWidth * 0.25, 40);

  const latestMainId = mainVersions[totalMainCols - 1]?.id;
  const lastMainX = mainColX(totalMainCols - 1);

  const totalBranchCount = [
    ...Object.values(branchesByParent).flat(),
    ...Object.values(legacyByMain).flat(),
  ].filter(v => v.status === VersionStatus.PENDING).length;

  const handleNodeEnter = (e: React.MouseEvent | React.PointerEvent, id: string) => {
    if (editMode) return; // 编辑模式下不显示 hover tooltip
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setMousePos({ x: e.clientX, y: e.clientY });
    setHoveredVersionId(id);
  };
  const handleNodeMove = (e: React.MouseEvent | React.PointerEvent) => {
    if (editMode) return;
    setMousePos({ x: e.clientX, y: e.clientY });
  };
  const handleNodeLeave = () => {
    if (editMode) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setHoveredVersionId(null), 50);
  };

  // 编辑模式节点点击
  const handleEditNodeClick = (e: React.MouseEvent, version: VersionWithSubmitter) => {
    e.preventDefault();
    setEditPopupVersion(version);
    setEditPopupPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="w-full" ref={containerRef}>
      <div ref={scrollRef} className="overflow-x-auto timeline-scroll-container-h" style={{ paddingBottom: "4px" }}>
        <div style={{ width: `${svgWidth}px`, position: "relative", flexShrink: 0, height: `${svgHeight}px` }}>

          {/* SVG 层：线条 + 节点圆 */}
          <svg
            width={svgWidth}
            height={svgHeight}
            overflow="visible"
            className="absolute top-0 left-0"
            style={{ zIndex: 0 }}
          >
            {/* 主干实线 */}
            <line x1={0} y1={MAIN_Y} x2={lastMainX} y2={MAIN_Y} stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" />

            {/* 编辑模式背景遮罩提示 */}
            {editMode && (
              <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="#fef9c3" fillOpacity={0.3} />
            )}

            {/* 分支连线 + 分支圆 */}
            {mainVersions.map((main, idx) => {
              const px = mainColX(idx);
              const branches = branchesForMain(main.id);
              return branches.map((branch, bIdx) => {
                const isMerged = branch.status === VersionStatus.MERGED;
                const mergedIntoMain = isMerged
                  ? mainVersions.find(m => m.parentVersionId === branch.id)
                  : undefined;
                const mergedNodeIdx = mergedIntoMain ? mainVersions.findIndex(m => m.id === mergedIntoMain.id) : -1;
                const mergedNodeX = mergedNodeIdx !== -1 ? mainColX(mergedNodeIdx) : -1;
                const bx = isMerged && mergedNodeX > 0 ? (px + mergedNodeX) / 2 : px + branchOffsetX;
                const by = BRANCH_BASE_Y + bIdx * BRANCH_ROW_H;
                const startY = MAIN_Y + MAIN_R + 2;
                const r = 12;
                const actualR = Math.min(r, (by - startY) / 2);
                const lineEndX = bx - BRANCH_R;
                const d2 = `M ${px} ${startY} L ${px} ${by - actualR} Q ${px} ${by}, ${px + actualR} ${by} L ${lineEndX} ${by}`;
                let dMerge = "";
                if (isMerged && mergedNodeX > 0) {
                  const nextStartY = MAIN_Y + MAIN_R + 2;
                  const rightLineStartX = bx + BRANCH_R;
                  const rightActualR = Math.min(r, Math.abs(by - nextStartY) / 2);
                  dMerge = `M ${rightLineStartX} ${by} L ${mergedNodeX - rightActualR} ${by} Q ${mergedNodeX} ${by}, ${mergedNodeX} ${by - rightActualR} L ${mergedNodeX} ${nextStartY}`;
                }
                return (
                  <g key={branch.id}>
                    <path d={d2} stroke={isMerged ? "#10B981" : "#FCD34D"} strokeWidth="1.5" strokeDasharray={isMerged ? "none" : "5 3"} fill="none" strokeLinecap="round" />
                    {isMerged && dMerge && (
                      <path d={dMerge} stroke="#10B981" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    )}
                    <circle
                      cx={bx} cy={by} r={BRANCH_R}
                      fill={isMerged ? "#10B981" : "white"}
                      stroke={isMerged ? "#059669" : "#FBBF24"}
                      strokeWidth={editMode ? "2.5" : "1.5"}
                    />
                    {/* 编辑模式：节点上的铅笔小图标 */}
                    {editMode && (
                      <text x={bx} y={by + 1} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="white" style={{ pointerEvents: "none" }}>✎</text>
                    )}
                  </g>
                );
              });
            })}

            {/* 主干节点圆 */}
            {mainVersions.map((v, idx) => {
              const x = mainColX(idx);
              const isLatest = v.id === latestMainId;
              const r = isLatest ? MAIN_R_LATEST : MAIN_R;
              return (
                <g key={v.id}>
                  {isLatest && !editMode && (
                    <foreignObject x={x - 32} y={MAIN_Y - 32} width={64} height={64} style={{ overflow: "visible" }}>
                      <div className="latest-node-pulse" />
                    </foreignObject>
                  )}
                  <circle
                    cx={x} cy={MAIN_Y} r={r}
                    fill={editMode ? "#f59e0b" : (isLatest ? "#3B82F6" : "#60A5FA")}
                    stroke={editMode ? "#d97706" : (isLatest ? "#2563EB" : "#3B82F6")}
                    strokeWidth={editMode ? "2.5" : "1.5"}
                  />
                  {editMode && (
                    <text x={x} y={MAIN_Y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="white" style={{ pointerEvents: "none" }}>✎</text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* DOM 层：文字标签 */}
          <div className="absolute top-0 left-0 w-full h-full" style={{ zIndex: 1, pointerEvents: "none" }}>
            {mainVersions.map((v, idx) => {
              const x = mainColX(idx);
              const displayLabel = v.name
                ? (v.name.length > 7 ? v.name.substring(0, 7) + "…" : v.name)
                : `V${v.versionNumber}`;
              const submitterName = v.submitter.realName || v.submitter.email.split("@")[0];
              return (
                <div key={v.id}>
                  <div
                    className="absolute flex flex-col items-center gap-0.5 select-none text-center"
                    style={{ left: `${x}px`, bottom: `${svgHeight - (MAIN_Y - MAIN_R_LATEST - 6)}px`, transform: "translateX(-50%)" }}
                  >
                    <div className="text-[11px] text-gray-400 whitespace-nowrap font-normal leading-tight">
                      {formatDate(v.createdAt)} · {submitterName}
                    </div>
                    <div className="text-sm text-gray-700 whitespace-nowrap font-semibold leading-tight">
                      {displayLabel}
                    </div>
                  </div>
                </div>
              );
            })}

            {mainVersions.map((main, idx) => {
              const px = mainColX(idx);
              return branchesForMain(main.id).map((branch, bIdx) => {
                const bxLabel = (() => {
                  const isMergedBranch = branch.status === VersionStatus.MERGED;
                  const mMain = isMergedBranch ? mainVersions.find(m => m.parentVersionId === branch.id) : undefined;
                  const mIdx = mMain ? mainVersions.findIndex(m => m.id === mMain.id) : -1;
                  const mX = mIdx !== -1 ? mainColX(mIdx) : -1;
                  return isMergedBranch && mX > 0 ? (px + mX) / 2 : px + branchOffsetX;
                })();
                const byLabel = BRANCH_BASE_Y + bIdx * BRANCH_ROW_H;
                const submitterName = branch.submitter.realName || branch.submitter.email.split("@")[0];
                const displayLabel = branch.name
                  ? (branch.name.length > 7 ? branch.name.substring(0, 7) + "…" : branch.name)
                  : `V${branch.versionNumber}`;
                return (
                  <div
                    key={branch.id}
                    className="absolute text-xs text-gray-600 whitespace-nowrap select-none text-center font-medium"
                    style={{ left: `${bxLabel}px`, top: `${byLabel + BRANCH_R + 5}px`, transform: "translateX(-50%)" }}
                  >
                    <span className="bg-white/90 px-1 rounded block">{displayLabel}</span>
                    <span className="block text-gray-400 text-[10px] bg-white/90 px-1 rounded">{submitterName}</span>
                  </div>
                );
              });
            })}
          </div>

          {/* 交互覆盖层 */}
          <div className="absolute top-0 left-0 w-full h-full" style={{ zIndex: 2, pointerEvents: "none" }}>
            {mainVersions.map((v, idx) => {
              const x = mainColX(idx);
              const r = v.id === latestMainId ? MAIN_R_LATEST : MAIN_R;
              const hitR = r + 12;
              return editMode ? (
                <button
                  key={v.id}
                  className="absolute rounded-full"
                  style={{ left: `${x - hitR}px`, top: `${MAIN_Y - hitR}px`, width: `${hitR * 2}px`, height: `${hitR * 2}px`, pointerEvents: "auto", cursor: "pointer" }}
                  onClick={(e) => handleEditNodeClick(e, v)}
                />
              ) : (
                <a
                  key={v.id}
                  href={`/dashboard/progress-trees/${treeId}#version-${v.id}`}
                  className="absolute rounded-full"
                  style={{ left: `${x - hitR}px`, top: `${MAIN_Y - hitR}px`, width: `${hitR * 2}px`, height: `${hitR * 2}px`, pointerEvents: "auto", cursor: "pointer" }}
                  onPointerEnter={(e) => handleNodeEnter(e, v.id)}
                  onPointerMove={handleNodeMove}
                  onPointerLeave={handleNodeLeave}
                />
              );
            })}
            {mainVersions.map((main, idx) => {
              const px = mainColX(idx);
              return branchesForMain(main.id).map((branch, bIdx) => {
                const isMergedBranch = branch.status === VersionStatus.MERGED;
                const mMain = isMergedBranch ? mainVersions.find(m => m.parentVersionId === branch.id) : undefined;
                const mIdx = mMain ? mainVersions.findIndex(m => m.id === mMain.id) : -1;
                const mX = mIdx !== -1 ? mainColX(mIdx) : -1;
                const bxClick = isMergedBranch && mX > 0 ? (px + mX) / 2 : px + branchOffsetX;
                const by = BRANCH_BASE_Y + bIdx * BRANCH_ROW_H;
                const hitR = BRANCH_R + 10;
                return editMode ? (
                  <button
                    key={branch.id}
                    className="absolute rounded-full"
                    style={{ left: `${bxClick - hitR}px`, top: `${by - hitR}px`, width: `${hitR * 2}px`, height: `${hitR * 2}px`, pointerEvents: "auto", cursor: "pointer" }}
                    onClick={(e) => handleEditNodeClick(e, branch)}
                  />
                ) : (
                  <a
                    key={branch.id}
                    href={`/dashboard/progress-trees/${treeId}#version-${branch.id}`}
                    className="absolute rounded-full"
                    style={{ left: `${bxClick - hitR}px`, top: `${by - hitR}px`, width: `${hitR * 2}px`, height: `${hitR * 2}px`, pointerEvents: "auto", cursor: "pointer" }}
                    onPointerEnter={(e) => handleNodeEnter(e, branch.id)}
                    onPointerMove={handleNodeMove}
                    onPointerLeave={handleNodeLeave}
                  />
                );
              });
            })}
          </div>
        </div>
      </div>

      {/* 底部统计 + 编辑按钮（外部控制模式时不显示内部编辑切换按钮） */}
      <div className="mt-1 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          共 {mainVersions.length} 个主线版本
          {totalBranchCount > 0 && <span className="ml-2 text-yellow-600">· {totalBranchCount} 个待审核分支</span>}
        </div>
        {canEdit && externalEditMode === undefined && (
          <div className="flex items-center gap-2">
            {internalEditMode ? (
              <>
                <span className="text-xs text-yellow-600 font-medium">✎ 点击节点进行编辑</span>
                <button
                  onClick={() => { setInternalEditMode(false); setEditPopupVersion(null); }}
                  className="px-3 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
                >
                  退出编辑
                </button>
              </>
            ) : (
              <button
                onClick={() => setInternalEditMode(true)}
                className="px-3 py-1 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 flex items-center gap-1"
              >
                <span>✎</span>
                <span>编辑节点</span>
              </button>
            )}
          </div>
        )}
        {/* 外部控制模式：显示提示文字 */}
        {canEdit && externalEditMode && (
          <span className="text-xs text-amber-600 font-medium">✎ 点击节点进行编辑</span>
        )}
      </div>

      {/* Hover Tooltip（非编辑模式） */}
      {!editMode && hoveredVersionId && (() => {
        const hv = versions.find(v => v.id === hoveredVersionId);
        if (!hv) return null;
        const isMain = hv.type === VersionType.MAIN;
        const name = hv.submitter.realName || hv.submitter.email.split("@")[0];
        return (
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{ left: mousePos.x + 14, top: mousePos.y + 14, minWidth: "200px" }}
          >
            <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-2xl border border-gray-700">
              <div className={`font-semibold mb-1.5 ${isMain ? "text-blue-300" : "text-yellow-300"}`}>
                {isMain ? "主线" : "分支"} V{hv.versionNumber}{hv.name ? ` · ${hv.name}` : ""}
              </div>
              <div className="text-gray-300 space-y-0.5">
                <div>👤 {name}</div>
                <div>📅 {formatFull(hv.createdAt)}</div>
                {hv.description && (
                  <div className="text-gray-400 italic mt-1 leading-relaxed">&ldquo;{hv.description}&rdquo;</div>
                )}
                {hv.note && (
                  <div className="text-amber-300 mt-1 border-t border-gray-700 pt-1">
                    📌 {hv.note}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 节点编辑弹窗（编辑模式） */}
      {editMode && editPopupVersion && (
        <NodeEditPopup
          version={editPopupVersion}
          pos={editPopupPos}
          onClose={() => setEditPopupVersion(null)}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
