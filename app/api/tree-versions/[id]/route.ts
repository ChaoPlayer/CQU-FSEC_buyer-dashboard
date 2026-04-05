import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// ── 权限检查 helper ──────────────────────────────────────────────────
async function checkEditable(versionId: string, sessionUserId: string, sessionRole: string) {
  const version = await prisma.treeVersion.findUnique({
    where: { id: versionId },
    include: {
      tree: { select: { id: true, groupId: true, creatorId: true } },
    },
  });
  if (!version) return { ok: false, status: 404, message: "版本不存在", version: null };

  const isAdmin = sessionRole === "ADMIN";
  const isCreator = version.tree.creatorId === sessionUserId;
  if (!isAdmin && !isCreator) {
    return { ok: false, status: 403, message: "仅管理员或进度树创建者可操作", version: null };
  }
  return { ok: true, status: 200, message: "", version };
}

// ── PATCH：更新备注 OR 撤回合并 OR 标记赛季保留 ────────────────────────────────────
export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "未授权" }, { status: 401 });

    const body = await req.json();
    const { action } = body; // "note" | "revert_merge" | "season_kept"

    // season_kept 走独立权限逻辑（不需要是进度树创建者）
    if (action === "season_kept") {
      const isAdmin = session.user.role === "ADMIN";
      const isGroupLeader = session.user.role === "GROUP_LEADER";
      if (!isAdmin && !isGroupLeader) {
        return NextResponse.json({ message: "仅组长或管理员可标记保留版本" }, { status: 403 });
      }

      // 验证有活跃的赛季结算
      const activeSettlement = await prisma.seasonSettlement.findFirst({
        where: { status: { in: ["NOT_STARTED", "LEADER_CONFIRMATION"] } },
      });
      if (!activeSettlement) {
        return NextResponse.json({ message: "当前没有进行中的赛季结算" }, { status: 400 });
      }

      // 查版本信息（用于权限检查）
      const versionForKept = await prisma.treeVersion.findUnique({
        where: { id },
        include: { tree: { select: { groupId: true } } },
      });
      if (!versionForKept) {
        return NextResponse.json({ message: "版本不存在" }, { status: 404 });
      }

      // 组长只能标记本组的版本
      if (isGroupLeader) {
        const leaderUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { groupId: true },
        });
        if (versionForKept.tree.groupId !== leaderUser?.groupId) {
          return NextResponse.json({ message: "只能标记本组的版本" }, { status: 403 });
        }
      }

      const updated = await prisma.treeVersion.update({
        where: { id },
        data: { seasonKept: body.seasonKept ?? false },
      });
      return NextResponse.json({
        version: updated,
        message: body.seasonKept ? "已标记为赛季保留" : "已取消赛季保留标记",
      });
    }

    // 其他 action 走原有权限检查（管理员或进度树创建者）
    const { ok, status, message, version } = await checkEditable(id, session.user.id, session.user.role);
    if (!ok) return NextResponse.json({ message }, { status });

    if (action === "note") {
      // 写入/清空备注
      const updated = await (prisma.treeVersion.update as any)({
        where: { id },
        data: { note: body.note ?? null },
      });
      return NextResponse.json({ version: updated, message: "备注已保存" });
    }

    if (action === "revert_merge") {
      // 撤回分支合并：仅对 MERGED 的 BRANCH 版本有效
      if (version!.type !== "BRANCH" || version!.status !== "MERGED") {
        return NextResponse.json({ message: "只能撤回已合并的分支版本" }, { status: 400 });
      }

      // 同时删除合并时产生的主线版本（parentVersionId === 当前分支 id 的 MAIN 版本）
      const mainFromMerge = await prisma.treeVersion.findFirst({
        where: { parentVersionId: id, type: "MAIN", treeId: version!.treeId },
      });

      if (mainFromMerge) {
        // 先把关联的工时记录断开（避免 FK 约束）
        if (mainFromMerge.hourRecordId) {
          await prisma.treeVersion.update({
            where: { id: mainFromMerge.id },
            data: { hourRecordId: null },
          });
        }
        await prisma.treeVersion.delete({ where: { id: mainFromMerge.id } });
      }

      // 把分支版本回退到 PENDING
      const updated = await prisma.treeVersion.update({
        where: { id },
        data: {
          status: "PENDING",
          mergedAt: null,
          mergedById: null,
          hourRecordId: null,
        },
      });
      return NextResponse.json({ version: updated, message: "已撤回合并，版本已回到待审核状态" });
    }

    return NextResponse.json({ message: "未知 action" }, { status: 400 });
  } catch (err) {
    console.error("PATCH tree-version error:", err);
    return NextResponse.json({ message: "服务器内部错误" }, { status: 500 });
  }
}

// ── DELETE：删除版本 ───────────────────────────────────────────────
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "未授权" }, { status: 401 });

    const { ok, status, message, version } = await checkEditable(id, session.user.id, session.user.role);
    if (!ok) return NextResponse.json({ message }, { status });

    // 如果有子版本（其他版本以此为 parent），拒绝删除，防止孤立节点
    const childCount = await prisma.treeVersion.count({ where: { parentVersionId: id } });
    if (childCount > 0) {
      return NextResponse.json(
        { message: `该版本有 ${childCount} 个子版本引用，请先删除子版本` },
        { status: 400 }
      );
    }

    // 断开工时记录关联（不删除工时记录本身，保留审计记录）
    if (version!.hourRecordId) {
      await prisma.treeVersion.update({
        where: { id },
        data: { hourRecordId: null },
      });
    }

    await prisma.treeVersion.delete({ where: { id } });
    return NextResponse.json({ message: "版本已删除" });
  } catch (err) {
    console.error("DELETE tree-version error:", err);
    return NextResponse.json({ message: "服务器内部错误" }, { status: 500 });
  }
}
