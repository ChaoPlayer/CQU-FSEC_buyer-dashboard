const { prisma } = require('./lib/prisma');
console.log('prisma object keys:', Object.keys(prisma));
console.log('Has teamGroup?', 'teamGroup' in prisma);
console.log('teamGroup type:', typeof prisma.teamGroup);
if (prisma.teamGroup) {
  console.log('teamGroup.findMany exists?', typeof prisma.teamGroup.findMany);
  prisma.teamGroup.findMany().then(groups => console.log('groups:', groups.length)).catch(err => console.error('Error:', err));
} else {
  console.error('teamGroup is undefined');
}