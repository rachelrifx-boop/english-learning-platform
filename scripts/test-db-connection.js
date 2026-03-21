const { PrismaClient } = require('@prisma/client');

// 直接使用生产环境数据库URL
const DATABASE_URL = 'postgresql://postgres:Raifxdd%2311ffr@db.cknvuclkzgylbmksfkfs.supabase.co:5432/postgres';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function testConnection() {
  console.log('测试数据库连接...\n');
  console.log('数据库URL:', DATABASE_URL.replace(/:([^:@]+)@/, ':****@'));

  try {
    // 测试连接
    await prisma.$connect();
    console.log('✅ 数据库连接成功\n');

    // 查询用户数量
    const userCount = await prisma.user.count();
    console.log('用户总数:', userCount);

    // 查询管理员用户
    const admin = await prisma.user.findUnique({
      where: { email: 'rachelrifx@gmail.com' }
    });

    if (admin) {
      console.log('\n管理员用户信息：');
      console.log('ID:', admin.id);
      console.log('邮箱:', admin.email);
      console.log('用户名:', admin.username);
      console.log('角色:', admin.role);
      console.log('密码哈希长度:', admin.passwordHash.length);
      console.log('创建时间:', admin.createdAt);
    } else {
      console.log('\n❌ 未找到管理员用户');
    }

    await prisma.$disconnect();
    console.log('\n✅ 测试完成');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  }
}

testConnection();
