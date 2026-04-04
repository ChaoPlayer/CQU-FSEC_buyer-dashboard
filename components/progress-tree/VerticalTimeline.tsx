"use client";

import { useState } from "react";
import { TreeVersion, VersionType, VersionStatus } from "@prisma/client";

type VersionWithRelations = TreeVersion & {
  submitter: {
    id: string;
    realName: string | null;
    email: string;
  };
  mergedBy?: {
    id: string;
    realName: string | null;
  } | null;
  hourRecord?: {
    id: string;
    hours: number;
  } | null;
  name?: string | null;
};

interface VerticalTimelineProps {
  versions: VersionWithRelations[];
}

// 判断是否为主干节点（MAIN类型，或者是已合并的分支）
function isMainNode(v: VersionWithRelations) {
  return v.type === VersionType.MAIN;
}

// 判断是否为待审核分支
function isPendingBranch(v: VersionWithRelations) {
  return v.type === VersionType.BRANCH && v.status === VersionStatus.PENDING;
}

// 获取状态标签文字
function getStatusText(status: VersionStatus) {
  switch (status) {
    case VersionStatus.MERGED: return "已合并";
    case VersionStatus.REJECTED: return "已驳回";
    case VersionStatus.PENDING: return "待审核";
    default: return "未知";
  }
}

// 格式化时间
function formatDate(date: Date | string) {
  return new Date(date).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VerticalTimeline({ versions }: VerticalTimelineProps) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  // 从新到旧排序
  const sorted = [...versions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-2">版本时间轴</h3>
        <p className="text-xs text-gray-400">暂无版本记录</p>
      </div>
    );
  }

  // 将所有版本按时间归类到渲染列表中
  // 策略：
  //   - MAIN 节点直接在主干上渲染（蓝色实心点）
  //   - BRANCH PENDING 节点在主干右侧偏移渲染（灰色空心点 + SVG虚线曲线）
  //   - BRANCH REJECTED / MERGED (已处理完的分支) 也在主干旁渲染，但颜色不同

  const mainCount = sorted.filter(isMainNode).length;
  const pendingCount = sorted.filter(isPendingBranch).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* 标题区 */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
          <span>版本时间轴</span>
          <span className="text-xs font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
            {sorted.length}
          </span>
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
            主干
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-white border-2 border-gray-400" />
            分支
          </span>
        </div>
      </div>

      {/*
        =====================
        滚动容器：自定义滚动条
        =====================
        通过全局 CSS 在 globals.css 中已定义或在此直接用 style 添加 webkit 自定义 scrollbar
      */}
      <div
        className="px-4 py-4"
      >
        {/* 整体相对定位容器，主干线通过绝对定位实现 */}
        <div className="relative">

          {/* =========================================
              主干垂直实线
              left: 20px 对应主干节点中心（节点为 w-3 h-3 = 12px，dot left 为 14px，中心 = 14+6=20px）
              ========================================= */}
          <div
            className="absolute top-3 bottom-3 w-0.5 bg-gray-200 rounded-full"
            style={{ left: "19px" }}
          />

          {/* 节点列表 */}
          <div className="flex flex-col gap-0">
            {sorted.map((version, index) => {
              const isMain = isMainNode(version);
              const isPending = isPendingBranch(version);
              const isRejected = version.status === VersionStatus.REJECTED;
              const isMergedBranch = version.type === VersionType.BRANCH && version.status === VersionStatus.MERGED;
              const isFirst = index === 0;
              const isLast = index === sorted.length - 1;
              const submitterName = version.submitter.realName || version.submitter.email.split("@")[0];
              const tooltipKey = version.id;

              return (
                <div
                  key={version.id}
                  className="relative flex items-start"
                  style={{ minHeight: "64px", paddingTop: "12px", paddingBottom: "12px" }}
                >
                  {/* ===== 主干节点：实心蓝色圆点，位于主线中心 ===== */}
                  {isMain && (
                    <div className="absolute z-10" style={{ left: "14px", top: "17px" }}>
                      <div
                        className="w-3 h-3 rounded-full bg-blue-600 shadow-sm cursor-pointer ring-2 ring-white hover:ring-blue-200 transition-all"
                        onMouseEnter={() => setTooltip(tooltipKey)}
                        onMouseLeave={() => setTooltip(null)}
                      />
                      {/* Tooltip */}
                      {tooltip === tooltipKey && (
                        <div className="absolute z-50 pointer-events-none"
                          style={{ left: "20px", top: "-8px", minWidth: "180px" }}
                        >
                          <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl">
                            <div className="font-semibold text-blue-300 mb-1">
                              主干 V{version.versionNumber}{version.name ? ` · ${version.name}` : ""}
                            </div>
                            <div className="text-gray-300 space-y-0.5">
                              <div>👤 {submitterName}</div>
                              <div>📅 {formatDate(version.createdAt)}</div>
                              {version.description && (
                                <div className="text-gray-400 italic mt-1 leading-relaxed">
                                  &ldquo;{version.description}&rdquo;
                                </div>
                              )}
                            </div>
                          </div>
                          {/* 三角指示 */}
                          <div
                            className="absolute w-0 h-0"
                            style={{
                              left: "-5px",
                              top: "14px",
                              borderTop: "5px solid transparent",
                              borderBottom: "5px solid transparent",
                              borderRight: "5px solid #111827",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== 分支节点：空心圆点，位于主线右侧偏移 ===== */}
                  {!isMain && (
                    <div className="absolute z-10" style={{ left: "44px", top: "17px" }}>
                      {/* SVG 虚线贝塞尔曲线：从分支圆点连接到主干线 */}
                      {/* 曲线从分支圆点中心 (0,6) 出发，弯向主干线 (-30, 6) */}
                      <svg
                        className="absolute pointer-events-none"
                        style={{
                          left: "-30px",
                          top: "-2px",
                          width: "30px",
                          height: "16px",
                          overflow: "visible",
                        }}
                        viewBox="0 0 30 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M 30 8 C 20 8, 10 8, 0 8"
                          stroke={isPending ? "#9CA3AF" : isRejected ? "#FCA5A5" : "#86EFAC"}
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                          fill="none"
                          strokeLinecap="round"
                        />
                      </svg>

                      {/* 空心圆点 */}
                      <div
                        className={`w-3 h-3 rounded-full cursor-pointer ring-2 ring-white hover:scale-110 transition-all ${
                          isPending
                            ? "bg-white border-2 border-gray-400"
                            : isRejected
                            ? "bg-white border-2 border-red-400"
                            : "bg-white border-2 border-green-400"
                        }`}
                        onMouseEnter={() => setTooltip(tooltipKey)}
                        onMouseLeave={() => setTooltip(null)}
                      />
                      {/* Tooltip */}
                      {tooltip === tooltipKey && (
                        <div
                          className="absolute z-50 pointer-events-none"
                          style={{ left: "20px", top: "-8px", minWidth: "180px" }}
                        >
                          <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl">
                            <div className={`font-semibold mb-1 ${
                              isPending ? "text-yellow-300" : isRejected ? "text-red-300" : "text-green-300"
                            }`}>
                              分支 V{version.versionNumber}{version.name ? ` · ${version.name}` : ""}
                            </div>
                            <div className="text-gray-300 space-y-0.5">
                              <div>👤 {submitterName}</div>
                              <div>📅 {formatDate(version.createdAt)}</div>
                              <div className={`text-xs font-medium mt-0.5 ${
                                isPending ? "text-yellow-400" : isRejected ? "text-red-400" : "text-green-400"
                              }`}>
                                {getStatusText(version.status)}
                              </div>
                              {version.description && (
                                <div className="text-gray-400 italic mt-1 leading-relaxed">
                                  &ldquo;{version.description}&rdquo;
                                </div>
                              )}
                            </div>
                          </div>
                          {/* 三角指示 */}
                          <div
                            className="absolute w-0 h-0"
                            style={{
                              left: "-5px",
                              top: "14px",
                              borderTop: "5px solid transparent",
                              borderBottom: "5px solid transparent",
                              borderRight: "5px solid #111827",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== 内容区域 ===== */}
                  <div
                    className={`flex-1 min-w-0 ${isMain ? "ml-10" : "ml-16"}`}
                  >
                    <div className={`rounded-lg px-3 py-2 transition-colors ${
                      isMain
                        ? "bg-blue-50/50 border border-blue-100 hover:bg-blue-50"
                        : isPending
                        ? "bg-gray-50 border border-dashed border-gray-200 hover:border-gray-300"
                        : isRejected
                        ? "bg-red-50/50 border border-red-100"
                        : "bg-green-50/50 border border-green-100"
                    }`}>
                      {/* 版本号行 */}
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isMain ? (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                              主干 V{version.versionNumber}
                            </span>
                          ) : (
                            <>
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                                分支 V{version.versionNumber}
                              </span>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                isPending
                                  ? "text-yellow-700 bg-yellow-100"
                                  : isRejected
                                  ? "text-red-700 bg-red-100"
                                  : "text-green-700 bg-green-100"
                              }`}>
                                {getStatusText(version.status)}
                              </span>
                            </>
                          )}
                        </div>
                        <time className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                          {formatDate(version.createdAt)}
                        </time>
                      </div>

                      {/* 名称 */}
                      {version.name && (
                        <p className="text-xs font-semibold text-gray-800 truncate mb-0.5">
                          {version.name}
                        </p>
                      )}

                      {/* 描述 */}
                      {version.description && (
                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mb-1">
                          {version.description}
                        </p>
                      )}

                      {/* 提交人 + 工时 */}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-gray-500 truncate">
                          👤 {submitterName}
                          {version.mergedBy && (
                            <span className="text-gray-400"> · 由 {version.mergedBy.realName} 合并</span>
                          )}
                        </span>
                        {version.hourRecord && (
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0 ml-1">
                            +{version.hourRecord.hours}h
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 底部统计 */}
      <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[10px] text-gray-400">
          {mainCount} 个主干版本
        </span>
        {pendingCount > 0 && (
          <span className="text-[10px] font-medium text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
            ⚠ {pendingCount} 个待审核
          </span>
        )}
      </div>
    </div>
  );
}
