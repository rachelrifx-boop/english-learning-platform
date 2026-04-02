const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true
      }
    });

    console.log('数据库中的用户列表:');
    console.log('===================');
    users.forEach((user, index) => {
      console.log(`${index + 1}. 用户名: ${user.username}`);
      console.log(`   邮箱: ${user.email}`);
      console.log(`   角色: ${user.role}`);
      console.log(`   注册时间: ${user.createdAt}`);
      console.log('');
    });

    console.log(`总共 ${users.length} 个用户`);
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
