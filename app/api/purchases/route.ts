import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

// 获取采购列表
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");

    // 根据角色构建筛选条件
    const where: any = {};
    if (session.user.role === "ADMIN") {
      // 管理员可以看到所有采购，除非指定了 userId
      if (userId) {
        where.userId = userId;
      }
    } else if (session.user.role === "GROUP_LEADER") {
      // 组长可以看到本组所有成员的采购
      const leader = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { group: true }
      });
      const group = leader?.group;
      let userIds: string[] = [session.user.id]; // 至少包含自己
      if (group) {
        const sameGroupUsers = await prisma.user.findMany({
          where: { group },
          select: { id: true }
        });
        userIds = sameGroupUsers.map(u => u.id);
      }
      where.userId = { in: userIds };
    } else {
      // 普通用户只能看到自己的采购
      where.userId = session.user.id;
    }
    if (status) {
      where.status = status;
    }

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        submittedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(purchases);
  } catch (error) {
    console.error("获取采购列表出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// 创建新采购
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('采购API会话:', session);
    if (!session) {
      return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { itemName, amount, currency, buyLink, imageUrl, pdfUrl, fileName, note, category, processorContact, materialCategory, hasInvoice, isAdvancedPayment, advancerName } = body;

    if (!itemName || amount === undefined) {
      return NextResponse.json(
        { message: "物品名称和金额为必填项" },
        { status: 400 }
      );
    }

    // 检查金额上限（可从设置中读取，这里暂定为 10000）
    const maxAmount = 10000;
    if (amount > maxAmount && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: `金额超过上限 ${maxAmount}` },
        { status: 403 }
      );
    }

    if (!session.user.id) {
      return NextResponse.json({ message: "用户ID缺失" }, { status: 400 });
    }
    console.log('创建采购，用户ID:', session.user.id, '角色:', session.user.role);
    const purchase = await prisma.purchase.create({
      data: {
        itemName,
        amount: parseFloat(amount),
        currency: currency || "CNY",
        buyLink: buyLink || null,
        imageUrl: imageUrl || null,
        pdfUrl: pdfUrl || null,
        fileName: fileName || null,
        note: note || null,
        // @ts-ignore
        category: category || null,
        // @ts-ignore
        processorContact: processorContact || null,
        materialCategory: materialCategory || null,
        hasInvoice: hasInvoice ?? null,
        isAdvancedPayment: isAdvancedPayment ?? null,
        advancerName: advancerName || null,
        status: "PENDING",
        userId: session.user.id,
      },
      include: {
        submittedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // 为所有管理员创建新采购通知
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: "new_purchase",
        title: `新的采购申请：${purchase.itemName}`,
        content: `用户 ${purchase.submittedBy?.name || purchase.submittedBy?.email || '未知'} 提交了新的采购申请，金额 ¥${purchase.amount.toFixed(2)}，请及时审批。`,
        purchaseId: purchase.id,
      });
    }

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    console.error("创建采购出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}