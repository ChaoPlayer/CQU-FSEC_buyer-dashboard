import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { realName } = body;

    if (!realName || typeof realName !== 'string' || realName.trim() === '') {
      return NextResponse.json(
        { success: false, message: '真实姓名不能为空' },
        { status: 400 }
      );
    }

    const trimmedName = realName.trim();

    // 查找匹配真实姓名的用户（真实姓名可能重复，但这里取第一个）
    const user = await prisma.user.findFirst({
      where: { realName: trimmedName },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: '未找到该姓名的预注册账号，请联系管理员添加' },
        { status: 404 }
      );
    }

    // 如果用户已有密码，说明已经激活，禁止重复激活
    if (user.password) {
      return NextResponse.json(
        { success: false, message: '该账号已激活，请直接登录' },
        { status: 400 }
      );
    }

    // 返回成功，携带用户ID及预注册信息
    return NextResponse.json({
      success: true,
      userId: user.id,
      realName: user.realName,
      email: user.email,
      studentId: user.studentId,
      group: user.group,
      message: '账号可激活',
    });

  } catch (error: any) {
    console.error('核验姓名失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器内部错误', error: error.message },
      { status: 500 }
    );
  }
}