import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, studentId, group, password } = body;

    // 必填字段校验
    if (!userId || !email || !password) {
      return NextResponse.json(
        { success: false, message: '缺少必要字段：userId、email、password 为必填' },
        { status: 400 }
      );
    }

    // 邮箱格式简单校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: '邮箱格式无效' },
        { status: 400 }
      );
    }

    // 查找目标用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    // 如果用户已有密码，说明已经激活，禁止重复激活
    if (user.password) {
      return NextResponse.json(
        { success: false, message: '该账号已激活，无法重复激活' },
        { status: 400 }
      );
    }

    // 检查邮箱是否已被其他用户占用（排除当前用户）
    const existingUserWithEmail = await prisma.user.findFirst({
      where: {
        email,
        id: { not: userId },
      },
    });
    if (existingUserWithEmail) {
      return NextResponse.json(
        { success: false, message: '该邮箱已被其他账号使用，请更换邮箱' },
        { status: 409 }
      );
    }

    // 如果提供了 studentId，检查是否被其他用户占用（可选）
    if (studentId && studentId.trim() !== '') {
      const existingUserWithStudentId = await prisma.user.findFirst({
        where: {
          studentId: studentId.trim(),
          id: { not: userId },
        },
      });
      if (existingUserWithStudentId) {
        return NextResponse.json(
          { success: false, message: '该学号已被其他账号使用，请更换学号' },
          { status: 409 }
        );
      }
    }

    // 验证 group 是否为有效值（动态查 TeamGroup 表，支持管理员随时新增组别）
    let groupId: string | undefined = undefined;
    let groupName: string | undefined = undefined;
    if (group && group.trim() !== '') {
      const teamGroup = await prisma.teamGroup.findFirst({
        where: { name: group.trim() },
      });
      if (!teamGroup) {
        return NextResponse.json(
          { success: false, message: '无效的组别，请刷新页面后重新选择' },
          { status: 400 }
        );
      }
      groupId = teamGroup.id;
      groupName = teamGroup.name;
    }

    // 对密码进行 bcrypt 加密（与 NextAuth 逻辑保持一致）
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 更新用户信息
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email,
        studentId: studentId?.trim() || null,
        group: groupName ?? undefined,    // 旧字段，过渡期兼容
        groupId: groupId ?? undefined,    // 新字段，关联 TeamGroup
        password: hashedPassword,
        // 保留 realName 和 name 不变
      },
    });

    // 移除敏感字段后返回
    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      success: true,
      message: '账号激活成功，请使用新邮箱和密码登录',
      user: userWithoutPassword,
    });

  } catch (error: any) {
    console.error('激活账号失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器内部错误', error: error.message },
      { status: 500 }
    );
  }
}