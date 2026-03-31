const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const studentId = '20232097'
  const users = await prisma.user.findMany({
    where: { studentId },
    include: {
      purchases: true,
      workSubmissions: true,
      hourRecords: true,
      notifications: true
    }
  })
  console.log(`Users with studentId ${studentId}:`, users.length)
  users.forEach((user, idx) => {
    console.log(`\nUser ${idx+1}:`, {
      id: user.id,
      email: user.email,
      group: user.group,
      createdAt: user.createdAt,
      purchaseCount: user.purchases.length,
      workSubmissionCount: user.workSubmissions.length,
      hourRecordCount: user.hourRecords.length,
      notificationCount: user.notifications.length
    })
  })
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())