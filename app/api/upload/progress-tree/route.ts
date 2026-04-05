import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";
import { randomUUID } from "crypto";

// 允许大文件上传，最长处理时间 5 分钟
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    // 获取用户所属组
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamGroup: { select: { name: true } } },
    });

    if (!user?.teamGroup) {
      return NextResponse.json({ message: "您不属于任何组，无法上传进度树文件" }, { status: 403 });
    }

    const groupName = user.teamGroup.name;
    // 清理组名中的非法字符（只保留字母数字和短横线）
    const safeGroupName = groupName.replace(/[^a-zA-Z0-9\-]/g, "_");

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ message: "未选择文件" }, { status: 400 });
    }

    // 生成唯一文件名：UUID + 原始文件名（保留扩展名）
    const originalName = file.name;
    const uuid = randomUUID();
    // 移除原始文件名中的路径和非法字符
    const safeOriginalName = originalName.replace(/[^a-zA-Z0-9\-_.]/g, "_");
    const fileName = `${uuid}_${safeOriginalName}`;
    const relativeDir = `progress-trees/${safeGroupName}`;
    const uploadDir = path.join(process.cwd(), "public/uploads", relativeDir);
    const filePath = path.join(uploadDir, fileName);

    // 确保上传目录存在
    await mkdir(uploadDir, { recursive: true });

    // 流式写入：边接收边写盘，支持超大文件（200MB+）且不占用大量内存
    const nodeReadable = Readable.fromWeb(file.stream() as any);
    await pipeline(nodeReadable, createWriteStream(filePath));

    // 返回可访问的 URL 和文件信息
    const fileUrl = `/uploads/${relativeDir}/${fileName}`;
    return NextResponse.json({
      url: fileUrl,
      fileName: originalName,
      fileSize: file.size,
      filePath: fileUrl, // 用于存储到数据库的路径
    });
  } catch (error) {
    console.error("上传进度树文件出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
