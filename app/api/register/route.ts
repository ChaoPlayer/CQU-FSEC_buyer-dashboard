import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, password, name, realName, studentId, group } = await request.json();

    if (!email || !password || !realName || !studentId || !group) {
      return NextResponse.json(
        { message: "邮箱、密码、真实姓名、学号和组别均为必填项" },
        { status: 400 }
      );
    }

    // 验证组别枚举值
    const validGroups = ["线路组", "电池组", "电控组", "转向组", "车架组", "悬架组", "车身组", "制动组", "传动组", "综合部"];
    if (!validGroups.includes(group)) {
      return NextResponse.json(
        { message: "组别选择无效" },
        { status: 400 }
      );
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "该邮箱已被注册" },
        { status: 409 }
      );
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户，默认为 USER 角色
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || "",
        realName,
        studentId,
        group,
        role: "USER",
      },
    });

    // 移除密码字段再返回
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { message: "注册成功", user: userWithoutPassword },
      { status: 201 }
    );
  } catch (error) {
    console.error("注册出错:", error);
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: 500 }
    );
  }
}