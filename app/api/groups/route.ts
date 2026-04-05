import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/groups - 公开获取所有组别（注册流程使用，无需登录）
export async function GET() {
  try {
    const groups = await prisma.teamGroup.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("获取组别列表失败:", error);
    return NextResponse.json(
      { error: "内部服务器错误" },
      { status: 500 }
    );
  }
}
