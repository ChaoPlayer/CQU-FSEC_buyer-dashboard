const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Checking duplicate studentId values...')
  // Query raw SQL to find duplicates
  const duplicates = await prisma.$queryRaw`
    SELECT studentId, COUNT(*) as count
    FROM User
    WHERE studentId IS NOT NULL
    GROUP BY studentId
    HAVING COUNT(*) > 1
  `
  console.log('Duplicate studentId rows:', duplicates)
  if (duplicates.length > 0) {
    console.log('Details of each duplicate:')
    for (const dup of duplicates) {
      const users = await prisma.user.findMany({
        where: { studentId: dup.studentId },
        select: { id: true, email: true, name: true, group: true }
      })
      console.log(`studentId ${dup.studentId}:`, users)
    }
    console.log('\nTotal duplicate groups:', duplicates.length)
  } else {
    console.log('No duplicate studentId found.')
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })