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

// ── PATCH：更新备注 OR 撤回合并 ────────────────────────────────────
export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "未授权" }, { status: 401 });

    const { ok, status, message, version } = await checkEditable(id, session.user.id, session.user.role);
    if (!ok) return NextResponse.json({ message }, { status });

    const body = await req.json();
    const { action } = body; // "note" | "revert_merge"

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
