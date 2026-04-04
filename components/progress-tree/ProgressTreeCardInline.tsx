"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import HorizontalTimeline from "./HorizontalTimeline";
import SubmitVersionButton from "./SubmitVersionButton";
import { VersionType, VersionStatus } from "@prisma/client";

type VersionWithSubmitter = {
  id: string;
  type: VersionType;
  status: VersionStatus;
  versionNumber: number | null;
  fileName: string | null;
  description: string;
  name: string | null;
  note?: string | null;
  parentVersionId: string | null;
  createdAt: Date | string;
  mergedAt: Date | string | null;
  submitter: { id: string; realName: string | null; email: string };
};

type TreeData = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  creatorId: string;
  group: { id: string; name: string };
  versions: VersionWithSubmitter[];
};

interface ProgressTreeCardInlineProps {
  tree: TreeData;
  showActions: boolean; // 是否显示编辑/提交等操作按钮
  isAdmin: boolean;
  isGroupLeader: boolean;
  currentUserId: string;
}

export default function ProgressTreeCardInline({
  tree,
  showActions,
  isAdmin,
  isGroupLeader,
  currentUserId,
}: ProgressTreeCardInlineProps) {
  const router = useRouter();

  // ── 进度树内联编辑状态 ──────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tree.name);
  const [editStatus, setEditStatus] = useState(tree.status);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleEdit = () => {
    setEditName(tree.name);
    setEditStatus(tree.status);
    setSaveError(null);
    setIsEditing(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      setSaveError("名称不能为空");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/progress-trees/${tree.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: tree.description,
          status: editStatus,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "保存失败");
      }
      setIsEditing(false);
      router.refresh();
    } catch (e: any) {
      setSaveError(e.message || "未知错误");
    } finally {
      setSaving(false);
    }
  };

  // ── 权限判断 ──────────────────────────────────────
  const treeIsCreator = isGroupLeader || tree.creatorId === currentUserId;
  const treeIsAdminNonCreator = isAdmin && tree.creatorId !== currentUserId;
  const canEdit = showActions; // 有操作权限才能编辑

  const mainVersionsMerged = tree.versions
    .filter((v) => v.type === "MAIN" && v.status === "MERGED")
    .map((v) => ({ id: v.id, versionNumber: v.versionNumber, name: v.name ?? null }));

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border transition-colors duration-200 ${
        isEditing ? "border-amber-300" : "border-gray-200"
      }`}
    >
      {/* ── 卡片顶部 ── */}
      <div
        className={`p-6 border-b transition-colors duration-200 ${
          isEditing ? "border-amber-200 bg-amber-50" : "border-gray-100"
        }`}
      >
        <div className="flex justify-between items-start gap-4">
          {/* 左侧：名称 + 标签 + 更新时间 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              {isEditing ? (
                /* 编辑模式：名称变为 input */
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                      if (e.key === "Escape") handleCancel();
                    }}
                    className="text-xl font-bold text-gray-900 bg-transparent border-0 border-b-2 border-amber-400 focus:outline-none focus:border-amber-500 flex-1 min-w-0 px-0.5 py-0"
                    placeholder="进度树名称"
                    disabled={saving}
                  />
                  {/* 状态选择器 */}
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    disabled={saving}
                    className="text-xs px-2 py-1 rounded-full border border-amber-300 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="ACTIVE">活跃</option>
                    <option value="ARCHIVED">已归档</option>
                  </select>
                </div>
              ) : (
                /* 普通模式：静态文字 */
                <h2 className="text-xl font-bold text-gray-900">{tree.name}</h2>
              )}

              {/* 组别标签（始终显示） */}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 shrink-0">
                {tree.group.name}
              </span>

              {/* 状态标签（非编辑模式显示） */}
              {!isEditing && (
                tree.status === "ACTIVE" ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 shrink-0">
                    活跃
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 shrink-0">
                    已归档
                  </span>
                )
              )}
            </div>

            <p className="text-gray-600 text-sm">
              最后更新：{new Date(tree.updatedAt).toLocaleString("zh-CN")}
            </p>

            {/* 保存错误提示 */}
            {saveError && (
              <p className="mt-1 text-xs text-red-600">⚠ {saveError}</p>
            )}
          </div>

          {/* 右侧操作按钮 */}
          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              /* 编辑模式：保存 + 取消 */
              <>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 flex items-center gap-1"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      保存中…
                    </>
                  ) : (
                    "保存"
                  )}
                </button>
              </>
            ) : (
              /* 普通模式：编辑 + 提交版本 */
              <>
                {canEdit && (
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    编辑
                  </button>
                )}
                {canEdit && (
                  <SubmitVersionButton
                    treeId={tree.id}
                    groupName={tree.group.name}
                    isCreator={treeIsCreator}
                    isAdminNonCreator={treeIsAdminNonCreator}
                    mainVersions={mainVersionsMerged}
                  />
                )}
              </>
            )}

            {/* 查看详情（始终显示） */}
            <a
              href={`/dashboard/progress-trees/${tree.id}`}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition flex items-center gap-2"
            >
              <span>查看详情</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* ── 卡片底部：横向时间轴 ── */}
      <div className="w-full overflow-visible p-6">
        <HorizontalTimeline
          treeId={tree.id}
          versions={tree.versions}
          canEdit={canEdit}
          externalEditMode={isEditing ? true : undefined}
        />
      </div>
    </div>
  );
}
