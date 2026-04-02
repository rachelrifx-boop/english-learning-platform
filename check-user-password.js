const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// 使用生产环境数据库
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:Raifxdd%2311ffr@db.cknvuclkzgylbmksfkfs.supabase.co:5432/postgres";

const prismaProd = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function checkUser() {
  try {
    const email = 'rachel-rifx@outlook.com';

    const user = await prismaProd.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('用户不存在');
      return;
    }

    console.log('=== 用户信息 ===');
    console.log('用户名:', user.username);
    console.log('邮箱:', user.email);
    console.log('ID:', user.id);
    console.log('密码哈希长度:', user.passwordHash.length);
    console.log('密码哈希前缀:', user.passwordHash.substring(0, 10));
    console.log('创建时间:', user.createdAt);
    console.log('更新时间:', user.updatedAt);

    // 测试几个可能的密码
    const testPasswords = ['123456', 'password', '12345678'];

    console.log('\n=== 测试密码验证 ===');
    for (const testPwd of testPasswords) {
      const isValid = await bcrypt.compare(testPwd, user.passwordHash);
      console.log(`密码 "${testPwd}": ${isValid ? '✓ 正确' : '✗ 错误'}`);
    }

    // 检查是否有重置token记录
    const resets = await prismaProd.passwordReset.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('\n=== 最近的密码重置记录 ===');
    resets.forEach(r => {
      console.log(`Token: ${r.token.substring(0, 20)}...`);
      console.log(`创建时间: ${r.createdAt}`);
      console.log(`过期时间: ${r.expiresAt}`);
      console.log(`已使用: ${r.used}`);
      console.log('---');
    });

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prismaProd.$disconnect();
  }
}

checkUser();
