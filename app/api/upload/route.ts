import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "未授权" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ message: "未选择文件" }, { status: 400 });
    }

    // 检查文件类型
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: "仅支持 JPEG、PNG、GIF 图片和 PDF 文件" },
        { status: 400 }
      );
    }

    // 检查文件大小（限制 10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: "文件大小不能超过 10MB" },
        { status: 400 }
      );
    }

    // 生成唯一文件名
    const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
    const fileName = `${randomUUID()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public/uploads");
    const filePath = path.join(uploadDir, fileName);

    // 确保上传目录存在
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    // 返回可访问的 URL
    const fileUrl = `/uploads/${fileName}`;
    return NextResponse.json({ url: fileUrl, fileName: file.name });
  } catch (error) {
    console.error("上传文件出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}