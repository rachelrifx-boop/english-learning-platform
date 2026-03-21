const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { createId } = require('@paralleldrive/cuid2');

// 直接使用生产环境数据库URL
const DATABASE_URL = 'postgresql://postgres:Raifxdd%2311ffr@db.cknvuclkzgylbmksfkfs.supabase.co:5432/postgres';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function createAdmin() {
  console.log('开始创建管理员账户...\n');

  const email = 'rachelrifx@gmail.com';
  const password = 'yddhb908';
  const username = 'Rachel';

  try {
    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('⚠️  用户已存在，正在更新为管理员...');
      await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' }
      });
      console.log('✅ 用户已更新为管理员');
    } else {
      // 密码哈希
      const passwordHash = await bcrypt.hash(password, 10);

      // 生成用户ID
      const userId = createId();

      // 创建管理员用户
      await prisma.user.create({
        data: {
          id: userId,
          email,
          username,
          passwordHash,
          role: 'ADMIN'
        }
      });

      console.log('✅ 管理员账户创建成功！');
      console.log('\n登录信息：');
      console.log('邮箱：', email);
      console.log('密码：', password);
      console.log('用户名：', username);
    }

    // 验证创建结果
    const admin = await prisma.user.findUnique({
      where: { email }
    });

    console.log('\n验证信息：');
    console.log('用户ID：', admin.id);
    console.log('角色：', admin.role);
    console.log('用户名：', admin.username);

  } catch (error) {
    console.error('❌ 创建管理员失败:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
