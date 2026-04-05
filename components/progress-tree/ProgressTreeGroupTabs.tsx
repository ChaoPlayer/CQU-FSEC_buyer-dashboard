"use client";

import { useState } from "react";

interface Group {
  id: string;
  name: string;
}

interface Props {
  role: "ADMIN" | "GROUP_LEADER";
  activeGroupId: string | null;
  userGroupId: string | null;
  ownGroup: Group | null;
  otherGroups: Group[];
  seasonId?: string | null;
}

const tabBase = "whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors";
const tabActive = "border-blue-500 text-blue-600";
const tabInactive = "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300";

export default function ProgressTreeGroupTabs({
  role,
  activeGroupId,
  userGroupId,
  ownGroup,
  otherGroups,
  seasonId,
}: Props) {
  // 构建带 season 参数的链接
  const buildHref = (groupParam: string) => {
    const base = `/dashboard/progress-trees?group=${groupParam}`;
    return seasonId ? `${base}&season=${encodeURIComponent(seasonId)}` : base;
  };
  const [expanded, setExpanded] = useState(false);

  // ── 管理员：全部 Tab + 所有组（自己组优先，与原逻辑一致）──
  if (role === "ADMIN") {
    const allGroupsOrdered = ownGroup ? [ownGroup, ...otherGroups] : otherGroups;
    return (
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="组别切换">
          <a
            href={buildHref("all")}
            className={`${tabBase} ${activeGroupId === null ? tabActive : tabInactive}`}
            aria-current={activeGroupId === null ? "page" : undefined}
          >
            全部
          </a>
          {allGroupsOrdered.map((group) => {
            const isActive = group.id === activeGroupId;
            return (
              <a
                key={group.id}
                href={buildHref(group.id)}
                className={`${tabBase} ${isActive ? tabActive : tabInactive}`}
                aria-current={isActive ? "page" : undefined}
              >
                {group.name}{group.id === userGroupId ? " ★" : ""}
              </a>
            );
          })}
        </nav>
      </div>
    );
  }

  // ── 组长：自己组 Tab + 折叠的"其他组别"按钮 ──
  return (
    <div className="mb-8 border-b border-gray-200">
      <nav className="-mb-px flex items-center gap-6 overflow-x-auto" aria-label="组别切换">
        {/* 自己的组 */}
        {ownGroup && (
          <a
            href={buildHref(ownGroup.id)}
            className={`${tabBase} ${activeGroupId === ownGroup.id ? tabActive : tabInactive}`}
            aria-current={activeGroupId === ownGroup.id ? "page" : undefined}
          >
            {ownGroup.name} ★
          </a>
        )}

        {/* 其他组别（折叠/展开） */}
        {otherGroups.length > 0 && (
          <>
            {!expanded ? (
              <button
                onClick={() => setExpanded(true)}
                className="whitespace-nowrap py-3 px-2 text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 border-b-2 border-transparent transition-colors"
              >
                其他组别
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <>
                {otherGroups.map((group) => {
                  const isActive = group.id === activeGroupId;
                  return (
                    <a
                      key={group.id}
                      href={buildHref(group.id)}
                      className={`${tabBase} ${isActive ? tabActive : tabInactive}`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {group.name}
                    </a>
                  );
                })}
                <button
                  onClick={() => setExpanded(false)}
                  className="whitespace-nowrap py-3 px-2 text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 border-b-2 border-transparent transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  收起
                </button>
              </>
            )}
          </>
        )}
      </nav>
    </div>
  );
}
