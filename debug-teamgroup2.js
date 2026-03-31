const { prisma } = require('./lib/prisma');
async function main() {
  console.log('Testing prisma.teamGroup...');
  try {
    const groups = await prisma.teamGroup.findMany();
    console.log('Success! Found', groups.length, 'groups');
    console.log(groups.map(g => g.name));
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}
main();