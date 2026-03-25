import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限（暂未实现，可根据项目需求添加）
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.role || session.user.role !== Role.ADMIN) {
    //   return NextResponse.json({ success: false, message: '无权访问' }, { status: 403 });
    // }

    const body = await request.json();
    const { names } = body;

    if (!Array.isArray(names)) {
      return NextResponse.json(
        { success: false, message: '请求体必须包含 names 数组' },
        { status: 400 }
      );
    }

    if (names.length === 0) {
      return NextResponse.json(
        { success: false, message: 'names 数组不能为空' },
        { status: 400 }
      );
    }

    const results = [];
    let createdCount = 0;
    let skippedCount = 0;

    for (const realName of names) {
      if (typeof realName !== 'string' || !realName.trim()) {
        results.push({ realName, status: 'invalid', message: '姓名无效' });
        continue;
      }

      const trimmedName = realName.trim();

      // 检查是否已存在相同真实姓名的用户
      const existingUser = await prisma.user.findFirst({
        where: { realName: trimmedName },
      });

      if (existingUser) {
        results.push({ realName: trimmedName, status: 'skipped', message: '用户已存在', userId: existingUser.id });
        skippedCount++;
        continue;
      }

      // 生成临时邮箱（移除非字母数字字符）
      const emailLocalPart = trimmedName.replace(/[^a-zA-Z0-9]/g, '');
      const placeholderEmail = `${emailLocalPart}_pending@cqufsae.com`;

      try {
        const user = await prisma.user.create({
          data: {
            email: placeholderEmail,
            name: trimmedName,
            realName: trimmedName,
            role: Role.USER,
            // studentId 留空
            // 其他字段使用默认值
          },
        });
        results.push({ realName: trimmedName, status: 'created', message: '预注册账号已创建', userId: user.id });
        createdCount++;
      } catch (error: any) {
        // 如果邮箱重复（可能因为姓名相同但特殊字符被移除），尝试使用带数字后缀的邮箱
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
          // 生成带随机后缀的邮箱
          const randomSuffix = Math.floor(Math.random() * 1000);
          const fallbackEmail = `${emailLocalPart}_pending${randomSuffix}@cqufsae.com`;
          try {
            const user = await prisma.user.create({
              data: {
                email: fallbackEmail,
                name: trimmedName,
                realName: trimmedName,
                role: Role.USER,
              },
            });
            results.push({ realName: trimmedName, status: 'created', message: '预注册账号已创建（邮箱后缀随机）', userId: user.id });
            createdCount++;
          } catch (fallbackError) {
            results.push({ realName: trimmedName, status: 'error', message: '创建失败（邮箱重复）' });
          }
        } else {
          results.push({ realName: trimmedName, status: 'error', message: error.message || '创建失败' });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `导入完成。共处理 ${names.length} 个姓名，成功创建 ${createdCount} 个，跳过 ${skippedCount} 个。`,
      createdCount,
      skippedCount,
      results,
    });

  } catch (error: any) {
    console.error('导入白名单失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器内部错误', error: error.message },
      { status: 500 }
    );
  }
}