import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

if (process.env.NODE_ENV !== "production") {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
}

function createPrismaClient() {
  return new PrismaClient();
}

// 如果全局实例存在但缺少 teamGroup 属性，则重新创建
let client = globalForPrisma.prisma;
console.log('Prisma client check:', { hasClient: !!client, hasTeamGroup: client && 'teamGroup' in client });
if (client && !('teamGroup' in client)) {
  // 旧的客户端缺少新模型，断开连接并创建新的
  console.warn('Prisma client missing teamGroup model, recreating...');
  (client as any).$disconnect?.();
  client = createPrismaClient();
  globalForPrisma.prisma = client;
} else if (!client) {
  client = createPrismaClient();
  globalForPrisma.prisma = client;
}

export const prisma = client;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;