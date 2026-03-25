import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, password, realName, studentId, group, inviteCode } = await request.json();

    if (!email || !password || !realName || !studentId || !group || !inviteCode) {
      return NextResponse.json(
        { message: "邮箱、密码、真实姓名、学号、组别和邀请码均为必填项" },
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

    // 校验邀请码
    const invite = await (prisma as any).inviteCode.findUnique({
      where: { code: inviteCode },
    });

    if (!invite) {
      return NextResponse.json(
        { message: "邀请码无效或已被使用" },
        { status: 400 }
      );
    }

    if (invite.isUsed) {
      return NextResponse.json(
        { message: "邀请码无效或已被使用" },
        { status: 400 }
      );
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 使用事务创建用户并更新邀请码
    const user = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          realName,
          studentId,
          group,
          role: "USER",
        },
      });
      await (tx as any).inviteCode.update({
        where: { id: invite.id },
        data: {
          isUsed: true,
          usedById: user.id,
        },
      });
      return user;
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