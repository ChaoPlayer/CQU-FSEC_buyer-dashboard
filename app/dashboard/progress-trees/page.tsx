import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CreateProgressTreeButton from "@/components/progress-tree/CreateProgressTreeButton";
import ProgressTreeGroupTabs from "@/components/progress-tree/ProgressTreeGroupTabs";
import SeasonManagerButton from "@/components/progress-tree/SeasonManagerButton";
import ProgressTreeCardInline from "@/components/progress-tree/ProgressTreeCardInline";
import { Role } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ group?: string; season?: string }>;
}

export default async function ProgressTreesPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const selectedGroupId = params.group || null;
  const selectedSeasonId = params.season || null; // 赛季 ID（来自 SeasonManagerButton）

  // 获取所有赛季（用于显示名称 + 切换赛季查询）
  const allSettlements = await prisma.seasonSettlement.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, seasonName: true, createdAt: true, completedAt: true, status: true },
  });

  // 当前选中的赛季（如果有 ?season= 参数）
  const selectedSettlement = selectedSeasonId
    ? allSettlements.find((s) => s.id === selectedSeasonId) ?? null
    : null;

  // 最新赛季名称（用于标题和按钮展示）
  const latestSettlement = allSettlements[0] ?? null;
  const currentSeasonName =
    latestSettlement?.seasonName ?? `${new Date().getFullYear()}赛季`;

  // 当前显示的赛季名称
  const displaySeasonName = selectedSettlement
    ? selectedSettlement.seasonName
    : currentSeasonName;

  // 获取所有组（ADMIN 和 GROUP_LEADER 需要）
  const allGroups = await prisma.teamGroup.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // 获取当前用户所属组
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { groupId: true, role: true },
  });
  const userGroupId = currentUser?.groupId;

  const isAdmin = session.user.role === Role.ADMIN;
  const isGroupLeader = session.user.role === Role.GROUP_LEADER;

  // 确定当前选中的组 ID
  let activeGroupId: string | null = null;
  if (selectedGroupId) {
    // 有明确的 URL 参数
    if (selectedGroupId === "all") {
      activeGroupId = null;
    } else {
      const groupExists = allGroups.find((g) => g.id === selectedGroupId);
      if (groupExists) {
        activeGroupId = selectedGroupId;
      }
    }
  } else {
    // 无 URL 参数，按角色设置默认值
    if (isAdmin) {
      activeGroupId = null; // 管理员默认「全部」
    } else if (userGroupId) {
      activeGroupId = userGroupId; // 组长/普通用户默认自己的组
    } else if (allGroups.length > 0) {
      activeGroupId = allGroups[0].id;
    }
  }

  // 根据选中组构建查询条件
  const where: any = {};
  if (activeGroupId) {
    where.groupId = activeGroupId;
  }

  // 权限过滤：普通用户只能看自己组
  if (session.user.role === Role.USER) {
    if (userGroupId) {
      where.groupId = userGroupId;
    } else {
      where.groupId = "nonexistent";
    }
  }

  // ── 赛季过滤（按 seasonId 精确匹配）────────────────────────────
  // 切换到历史赛季时：按 seasonId 过滤，只显示归属该赛季的进度树
  // 无 season 参数（当前视图）：按最新赛季过滤；若从未运行迁移，则 seasonId=null 的进度树也显示
  if (selectedSeasonId) {
    // 切换到指定赛季
    (where as any).seasonId = selectedSeasonId;
  } else {
    // 当前视图：最新赛季 + seasonId 为 null 的旧数据
    if (latestSettlement) {
      (where as any).OR = [
        { seasonId: latestSettlement.id },
        { seasonId: null },
      ];
    }
  }
  // ────────────────────────────────────────────────────────────────


  const trees = await (prisma.progressTree.findMany as any)({
    where,
    include: {
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      creator: {
        select: {
          id: true,
        },
      },
      versions: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          type: true,
          status: true,
          versionNumber: true,
          fileName: true,
          description: true,
          name: true,
          note: true,
          parentVersionId: true,
          createdAt: true,
          mergedAt: true,
          submitter: {
            select: {
              id: true,
              realName: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // 计算当前选中组是否是用户自己的组（用于操作按钮显示）
  const isViewingOwnGroup = activeGroupId === userGroupId;

  // 操作按钮显示逻辑（历史赛季视图不显示创建按钮）
  const isHistoryView = !!selectedSettlement;
  const showActions =
    !isHistoryView && (isAdmin || (isGroupLeader && isViewingOwnGroup));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-3xl font-bold text-gray-900">进度树</h1>
            <span className="text-3xl font-bold text-gray-900">
              — {displaySeasonName}
            </span>
            {/* 仅管理员显示赛季管理按钮 */}
            {isAdmin && (
              <SeasonManagerButton currentSeasonName={currentSeasonName} />
            )}
          </div>
          <p className="text-gray-600 mt-2">
            {isHistoryView ? (
              <span className="text-amber-600 font-medium">
                📅 历史赛季视图（只读）
              </span>
            ) : isAdmin ? (
              "所有组的进度树概览"
            ) : isGroupLeader ? (
              "您所在组的进度树列表"
            ) : (
              "您所在组的进度树列表"
            )}
          </p>
        </div>
        {showActions && <CreateProgressTreeButton />}
      </div>

      {/* 组别 Tab 栏 */}
      {(isAdmin || isGroupLeader) &&
        allGroups.length > 0 &&
        (() => {
          const ownGroup = userGroupId
            ? allGroups.find((g) => g.id === userGroupId) ?? null
            : null;
          const otherGroups = userGroupId
            ? allGroups.filter((g) => g.id !== userGroupId)
            : allGroups;
          return (
            <ProgressTreeGroupTabs
              role={isAdmin ? "ADMIN" : "GROUP_LEADER"}
              activeGroupId={activeGroupId}
              userGroupId={userGroupId ?? null}
              ownGroup={ownGroup}
              otherGroups={otherGroups}
              seasonId={selectedSeasonId}
            />
          );
        })()}

      {trees.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">暂无进度树</h3>
          <p className="mt-2 text-gray-500">
            {isHistoryView
              ? "该赛季期间暂无进度树记录"
              : showActions
              ? "点击右上角按钮创建第一个进度树"
              : "请联系组长创建进度树"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {trees.map((tree: any) => (
            <ProgressTreeCardInline
              key={tree.id}
              tree={tree}
              showActions={showActions}
              isAdmin={isAdmin}
              isGroupLeader={isGroupLeader}
              currentUserId={session.user.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
