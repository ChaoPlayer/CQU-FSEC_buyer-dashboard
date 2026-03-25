import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { prisma } from '@/lib/prisma';
import { HourType, Role } from '@prisma/client';
export const dynamic = 'force-dynamic';

// 文件路径配置
const CSV_FILE_PATH = process.env.NODE_ENV === 'production'
  ? '/app/data/attendance_log.csv'   // Docker 容器内路径（通过 Volume 挂载）
  : path.join(process.cwd(), 'data', 'attendance_log.csv'); // 本地开发模拟路径

// 原始打卡流水账 CSV 记录类型定义（中文表头）
interface RawAttendanceRecord {
  '工号': string;
  '打卡时间': string;
  '姓名'?: string; // 新增姓名列
  '设备名称'?: string; // 可选字段
  employeeNo?: string; // 英文键名兼容
  punchTime?: string; // 英文键名兼容
  realName?: string; // 英文键名兼容
}

// 分组键
interface GroupKey {
  employeeNo: string;
  date: string; // YYYY-MM-DD
}

// 五分钟去重阈值（毫秒）
const FIVE_MINUTES_MS = 5 * 60 * 1000;

// 辅助函数：从 Date 对象获取 YYYY-MM-DD 格式的日期字符串
function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 辅助函数：计算两个 Date 之间的小时数（保留两位小数）
function calculateHoursDiff(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100; // 保留两位小数
}

// 去重逻辑：对于排序后的打卡时间数组，合并五分钟内的相邻记录，保留较晚的
function deduplicatePunchTimes(times: Date[]): Date[] {
  if (times.length === 0) return [];
  const sorted = [...times].sort((a, b) => a.getTime() - b.getTime());
  const result: Date[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = result[result.length - 1];
    const curr = sorted[i];
    if (curr.getTime() - prev.getTime() <= FIVE_MINUTES_MS) {
      // 五分钟内，用较晚的替换前一个（实际上就是保留当前，丢弃前一个）
      result[result.length - 1] = curr;
    } else {
      result.push(curr);
    }
  }
  return result;
}

export async function GET(request: NextRequest) {
  console.log('开始同步考勤数据，CSV 文件路径:', CSV_FILE_PATH);
  try {
    // 1. 检查文件是否存在（增强日志）
    try {
      await fs.access(CSV_FILE_PATH);
      const stats = await fs.stat(CSV_FILE_PATH);
      console.log(`文件存在，大小: ${stats.size} 字节，最后修改时间: ${stats.mtime.toISOString()}`);
    } catch (accessErr: any) {
      console.error(`文件访问失败，路径: ${CSV_FILE_PATH}`, accessErr);
      if (accessErr.code === 'ENOENT') {
        return NextResponse.json(
          { 
            success: false, 
            message: `CSV 文件不存在，请检查路径: ${CSV_FILE_PATH}`,
            suggestion: '在 Docker 容器中请确保 volume 挂载正确，宿主机路径应为 /volume1/CQU_data/attendance_log.csv'
          },
          { status: 404 }
        );
      }
      throw accessErr;
    }

    // 2. 读取 CSV 文件
    const fileContent = await fs.readFile(CSV_FILE_PATH, 'utf-8');
    console.log('CSV 文件读取成功，长度:', fileContent.length, '字符');
    
    // 3. 解析 CSV（使用中文表头）
    const rawRecords = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as RawAttendanceRecord[];

    console.log('CSV 解析完成，原始记录条数:', rawRecords.length);
    if (rawRecords.length === 0) {
      return NextResponse.json(
        { success: false, message: 'CSV 文件为空或无数据' },
        { status: 400 }
      );
    }

    // 打印前几条记录的列名以便调试
    const firstRecord = rawRecords[0];
    console.log('CSV 列名:', Object.keys(firstRecord).join(', '));
    console.log('示例记录:', JSON.stringify(firstRecord));

    // 4. 将原始记录按员工和日期分组
    const groups = new Map<string, Date[]>(); // key: `${employeeNo}|${date}` -> 打卡时间数组
    const realNameMap = new Map<string, string>(); // key: `${employeeNo}|${date}` -> 真实姓名
    let parseErrorCount = 0;
    const parseErrors: string[] = [];

    for (const record of rawRecords) {
      try {
        // 兼容中文、英文键名，强转字符串并去除空格
        const employeeNo = (record['工号'] ?? record.employeeNo)?.toString()?.trim();
        const punchTimeStr = (record['打卡时间'] ?? record.punchTime)?.toString()?.trim();
        const realName = (record['姓名'] ?? record.realName)?.toString()?.trim() || employeeNo; // 姓名列，默认为工号

        // 极度严谨的空值校验：只拦截 undefined 或空字符串，绝不拦截 "0"
        if (employeeNo === undefined || employeeNo === '' || punchTimeStr === undefined || punchTimeStr === '') {
          parseErrors.push(`记录缺少工号或打卡时间: ${JSON.stringify(record)}`);
          parseErrorCount++;
          continue; // 使用 continue 跳过当前循环，进入下一条
        }

        const punchTime = new Date(punchTimeStr);
        if (isNaN(punchTime.getTime())) {
          parseErrors.push(`打卡时间格式无效: ${punchTimeStr}`);
          parseErrorCount++;
          continue;
        }

        const dateKey = toDateString(punchTime);
        const groupKey = `${employeeNo}|${dateKey}`;
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(punchTime);
        // 存储真实姓名（如果未存储过则存储，同一分组可能有多条记录）
        if (!realNameMap.has(groupKey)) {
          realNameMap.set(groupKey, realName);
        }
      } catch (err) {
        parseErrorCount++;
        parseErrors.push(`记录处理异常: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    console.log(`分组完成，共 ${groups.size} 个员工-日期组合，解析失败 ${parseErrorCount} 条`);

    // 5. 遍历每个分组，计算最早、最晚打卡时间和总工时
    let upsertedCount = 0;
    let errorCount = 0;
    const upsertErrors: string[] = [];

    for (const [groupKey, punchTimes] of groups.entries()) {
      try {
        const [employeeNo, dateStr] = groupKey.split('|');
        console.log(`处理 ${employeeNo} ${dateStr}，原始打卡次数: ${punchTimes.length}`);

        // 去重
        const dedupedTimes = deduplicatePunchTimes(punchTimes);
        console.log(`  去重后打卡次数: ${dedupedTimes.length}`);

        if (dedupedTimes.length === 0) {
          console.warn(`  警告：去重后无打卡记录，跳过`);
          continue;
        }

        // 计算最早和最晚打卡时间
        const firstPunch = dedupedTimes[0];
        const lastPunch = dedupedTimes[dedupedTimes.length - 1];
        const totalHours = calculateHoursDiff(firstPunch, lastPunch);

        console.log(`  最早打卡: ${firstPunch.toISOString()}`);
        console.log(`  最晚打卡: ${lastPunch.toISOString()}`);
        console.log(`  总工时: ${totalHours} 小时`);

        // 日期对象用于数据库存储（时间部分为最早/最晚打卡时间，日期部分为当天）
        const dateOnly = new Date(dateStr + 'T00:00:00Z'); // 使用 UTC 日期

        // 执行 upsert
        await prisma.attendanceSummary.upsert({
          where: {
            employeeNo_date: {
              employeeNo,
              date: dateOnly,
            },
          },
          update: {
            firstPunch,
            lastPunch,
            totalHours,
          },
          create: {
            employeeNo,
            date: dateOnly,
            firstPunch,
            lastPunch,
            totalHours,
          },
        });

        // 查找或创建对应的用户（基于真实姓名匹配）
        const realName = realNameMap.get(groupKey) || employeeNo;
        let user = await prisma.user.findFirst({
          where: { realName },
        });

        if (!user) {
          // 按姓名找不到用户，自动创建预注册账号
          const placeholderEmail = `${realName.replace(/[^a-zA-Z0-9]/g, '')}_pending@cqufsae.com`;
          user = await prisma.user.upsert({
            where: { email: placeholderEmail },
            update: {}, // 如果已存在则保持原样
            create: {
              email: placeholderEmail,
              name: realName,
              realName,
              studentId: employeeNo,
              role: Role.USER,
              // 其他字段使用默认值
            },
          });
          console.log(`已为姓名 ${realName} (工号 ${employeeNo}) 创建预注册用户，ID: ${user.id}`);
        }

        // 查找是否已存在同一天的考勤工时记录
        const existing = await prisma.hourRecord.findFirst({
          where: {
            userId: user.id,
            date: dateOnly,
            type: HourType.ATTENDANCE,
          },
        });

        if (existing) {
          // 更新现有记录
          await prisma.hourRecord.update({
            where: { id: existing.id },
            data: { hours: totalHours },
          });
        } else {
          // 创建新记录
          await prisma.hourRecord.create({
            data: {
              userId: user.id,
              date: dateOnly,
              type: HourType.ATTENDANCE,
              hours: totalHours,
              description: `考勤打卡 ${employeeNo}`,
            },
          });
        }

        upsertedCount++;
        console.log(`  ${employeeNo} ${dateStr} 同步成功`);
      } catch (err) {
        errorCount++;
        const errMsg = `分组 ${groupKey} 处理失败: ${err instanceof Error ? err.message : String(err)}`;
        upsertErrors.push(errMsg);
        console.error(errMsg);
      }
    }

    // 6. 返回结果
    const result = {
      success: true,
      message: `同步完成。成功: ${upsertedCount} 条，解析失败: ${parseErrorCount} 条，处理失败: ${errorCount} 条。`,
      upsertedCount,
      parseErrorCount,
      errorCount,
      parseErrors: parseErrors.length > 0 ? parseErrors.slice(0, 10) : undefined, // 只返回前10条避免响应过大
      upsertErrors: upsertErrors.length > 0 ? upsertErrors.slice(0, 10) : undefined,
    };
    console.log('同步结果:', result);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('考勤同步失败:', error);
    // 检查是否为文件不存在错误（虽然前面已检查，但可能仍有其他错误）
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