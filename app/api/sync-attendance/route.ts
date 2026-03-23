import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { prisma } from '@/lib/prisma';

// 文件路径配置
const CSV_FILE_PATH = process.env.NODE_ENV === 'production'
  ? '/app/data/attendance_log.csv'   // Docker 容器内路径（通过 Volume 挂载）
  : path.join(process.cwd(), 'data', 'attendance_log.csv'); // 本地开发模拟路径

// CSV 记录类型定义
interface AttendanceCsvRecord {
  employeeNo: string;
  date: string;
  firstPunch?: string;
  lastPunch?: string;
  totalHours?: string;
}

export async function GET(request: NextRequest) {
  try {
    // 1. 读取 CSV 文件
    const fileContent = await fs.readFile(CSV_FILE_PATH, 'utf-8');
    
    // 2. 解析 CSV
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as AttendanceCsvRecord[];

    if (!records.length) {
      return NextResponse.json(
        { success: false, message: 'CSV 文件为空或无数据' },
        { status: 400 }
      );
    }

    // 3. 遍历记录并 upsert 到数据库
    let upsertedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const record of records) {
      try {
        // 验证必需字段
        const employeeNo = record.employeeNo?.trim();
        const dateStr = record.date?.trim();
        const firstPunchStr = record.firstPunch?.trim();
        const lastPunchStr = record.lastPunch?.trim();
        const totalHoursStr = record.totalHours?.trim();

        if (!employeeNo || !dateStr) {
          errors.push(`记录缺少工号或日期: ${JSON.stringify(record)}`);
          errorCount++;
          continue;
        }

        // 解析日期 (格式假设为 YYYY-MM-DD)
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          errors.push(`日期格式无效: ${dateStr}`);
          errorCount++;
          continue;
        }

        // 解析打卡时间（可能为空）
        let firstPunch: Date | null = null;
        let lastPunch: Date | null = null;
        if (firstPunchStr) {
          const fp = new Date(firstPunchStr);
          if (!isNaN(fp.getTime())) firstPunch = fp;
        }
        if (lastPunchStr) {
          const lp = new Date(lastPunchStr);
          if (!isNaN(lp.getTime())) lastPunch = lp;
        }

        // 解析总工时
        const totalHours = totalHoursStr ? parseFloat(totalHoursStr) : null;

        // 执行 upsert
        await prisma.attendanceSummary.upsert({
          where: {
            employeeNo_date: {
              employeeNo,
              date,
            },
          },
          update: {
            firstPunch,
            lastPunch,
            totalHours,
          },
          create: {
            employeeNo,
            date,
            firstPunch,
            lastPunch,
            totalHours,
          },
        });

        upsertedCount++;
      } catch (err) {
        errorCount++;
        errors.push(`记录处理失败: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 4. 返回结果
    return NextResponse.json({
      success: true,
      message: `同步完成。成功: ${upsertedCount} 条，失败: ${errorCount} 条。`,
      upsertedCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('考勤同步失败:', error);
    // 检查是否为文件不存在错误
    if (error.code === 'ENOENT') {
      return NextResponse.json(
        { 
          success: false, 
          message: `CSV 文件不存在，请检查路径: ${CSV_FILE_PATH}`,
          suggestion: '在本地开发时，请将 attendance_log.csv 放置在 ./data/ 目录下'
        },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, message: '考勤同步失败', error: error.message },
      { status: 500 }
    );
  }
}

// 也支持 POST 请求（与 GET 相同逻辑）
export async function POST(request: NextRequest) {
  return GET(request);
}