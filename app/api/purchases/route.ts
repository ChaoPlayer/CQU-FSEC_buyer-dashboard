import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

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

    // 管理员可以查看所有采购，普通用户只能查看自己的
    const where: any = {};
    if (session.user.role !== "ADMIN") {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
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
    if (!session) {
      return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { itemName, amount, currency, buyLink, imageUrl, pdfUrl, fileName, note } = body;

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

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    console.error("创建采购出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}