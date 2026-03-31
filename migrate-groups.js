const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Starting group migration...')
  
  // 1. 获取所有不同的非空 group 值
  const distinctGroups = await prisma.user.findMany({
    where: {
      group: { not: null, not: '' }
    },
    select: {
      group: true
    },
    distinct: ['group']
  })
  console.log(`Found ${distinctGroups.length} distinct groups:`, distinctGroups.map(g => g.group))
  
  // 2. 为每个 group 创建 TeamGroup 记录（如果不存在）
  const groupMap = {} // group name -> TeamGroup id
  for (const { group } of distinctGroups) {
    if (!group) continue
    let teamGroup = await prisma.teamGroup.findUnique({
      where: { name: group }
    })
    if (!teamGroup) {
      teamGroup = await prisma.teamGroup.create({
        data: { name: group }
      })
      console.log(`Created TeamGroup: ${teamGroup.name} (${teamGroup.id})`)
    } else {
      console.log(`TeamGroup already exists: ${teamGroup.name}`)
    }
    groupMap[group] = teamGroup.id
  }
  
  // 3. 更新每个用户的 groupId
  let updatedCount = 0
  for (const [groupName, groupId] of Object.entries(groupMap)) {
    const result = await prisma.user.updateMany({
      where: { group: groupName },
      data: { groupId }
    })
    console.log(`Updated ${result.count} users with group "${groupName}"`)
    updatedCount += result.count
  }
  
  // 4. 处理 group 为 null 或空字符串的用户
  const nullResult = await prisma.user.updateMany({
    where: { OR: [{ group: null }, { group: '' }] },
    data: { groupId: null }
  })
  console.log(`Set groupId = null for ${nullResult.count} users with empty group`)
  
  console.log(`Migration completed. Total users updated: ${updatedCount}`)
}

main()
  .catch(e => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })