const { PrismaClient } = require('@prisma/client');

// 使用连接池URL
const DATABASE_URL = 'postgresql://postgres:Raifxdd%2311ffr@aws-0-us-east-1.pooler.supabase.com:5432/postgres';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function testConnection() {
  console.log('测试连接池URL...\n');
  console.log('连接池URL:', DATABASE_URL.replace(/:([^:@]+)@/, ':****@'));

  try {
    await prisma.$connect();
    console.log('✅ 连接池连接成功\n');

    const userCount = await prisma.user.count();
    console.log('用户总数:', userCount);

    const admin = await prisma.user.findUnique({
      where: { email: 'rachelrifx@gmail.com' }
    });

    if (admin) {
      console.log('\n管理员用户信息：');
      console.log('ID:', admin.id);
      console.log('邮箱:', admin.email);
      console.log('用户名:', admin.username);
      console.log('角色:', admin.role);
    }

    await prisma.$disconnect();
    console.log('\n✅ 测试完成');
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error('详细错误:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();
