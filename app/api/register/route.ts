import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "邮箱和密码为必填项" },
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