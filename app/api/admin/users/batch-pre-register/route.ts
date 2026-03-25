import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "未经授权" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "未提供文件" }, { status: 400 });
    }

    // 验证文件类型
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "仅支持 .xlsx 或 .xls 格式的文件" },
        { status: 400 }
      );
    }

    // 读取文件内容
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      header: 1,
      raw: false,
    });
    if (rows.length < 2) {
      return NextResponse.json(
        { error: "Excel 文件至少应包含表头和数据行" },
        { status: 400 }
      );
    }

    // 提取表头（第一行）
    const headers = rows[0] as string[];
    // 查找列索引
    const nameColIndex = headers.findIndex((h) =>
      ["姓名", "真实姓名", "名字", "姓名/名字"].includes(h.trim())
    );
    const studentIdColIndex = headers.findIndex((h) =>
      ["学号", "工号", "学号/工号", "学号工号", "studentId"].includes(h.trim())
    );
    const groupColIndex = headers.findIndex((h) =>
      ["组别", "分组", "部门", "group"].includes(h.trim())
    );

    if (nameColIndex === -1) {
      return NextResponse.json(
        { error: "Excel 中未找到“姓名”列（可接受列名：姓名、真实姓名、名字）" },
        { status: 400 }
      );
    }

    let imported = 0;
    let skipped = 0;

    // 遍历数据行（从第二行开始）
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as any[];
      if (!row || row.length === 0) continue;

      const realName = row[nameColIndex]?.toString().trim();
      const studentId = studentIdColIndex >= 0 ? row[studentIdColIndex]?.toString().trim() : null;
      const group = groupColIndex >= 0 ? row[groupColIndex]?.toString().trim() : null;

      if (!realName) {
        // 姓名为空，跳过
        skipped++;
        continue;
      }

      // 检查是否已存在相同真实姓名或学号的用户
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { realName: { equals: realName } },
            ...(studentId ? [{ studentId: { equals: studentId } }] : []),
          ],
        },
      });

      if (existingUser) {
        skipped++;
        continue;
      }

      // 生成唯一邮箱
      const baseEmail = `${realName.replace(/\s+/g, "_")}_pending@cqufsae.com`;
      let email = baseEmail;
      let suffix = 1;
      while (await prisma.user.findUnique({ where: { email } })) {
        email = `${realName.replace(/\s+/g, "_")}_pending${suffix}@cqufsae.com`;
        suffix++;
      }

      // 创建影子账号
      await prisma.user.create({
        data: {
          email,
          name: null,
          password: null,
          role: "USER",
          maxLimit: null,
          approvalLimit: null,
          realName,
          studentId,
          group,
        },
      });

      imported++;
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      message: `批量预注册完成，成功导入 ${imported} 人，跳过 ${skipped} 人（已存在或数据无效）`,
    });
  } catch (error) {
    console.error("批量预注册失败:", error);
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
}