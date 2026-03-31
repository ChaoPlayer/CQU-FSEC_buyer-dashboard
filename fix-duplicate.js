const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const studentId = '20232097'
  const users = await prisma.user.findMany({
    where: { studentId },
    orderBy: { createdAt: 'asc' }
  })
  if (users.length <= 1) {
    console.log('No duplicates to fix.')
    return
  }
  // Keep the first (earliest) user, update the rest to have null studentId
  const [keep, ...toUpdate] = users
  console.log(`Keeping user ${keep.id} (${keep.email}) with studentId ${keep.studentId}`)
  for (const user of toUpdate) {
    console.log(`Setting studentId to null for user ${user.id} (${user.email})`)
    await prisma.user.update({
      where: { id: user.id },
      data: { studentId: null }
    })
  }
  console.log('Duplicate fixed.')
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())