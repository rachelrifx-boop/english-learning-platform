const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// 使用直接连接（非连接池）- 与 Vercel 环境保持一致
const DIRECT_DB_URL = "postgresql://postgres:Raifxdd%2311ffr@db.cknvuclkzgylbmksfkfs.supabase.co:5432/postgres";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DIRECT_DB_URL
    }
  }
});

async function updatePassword() {
  try {
    const email = 'rachel-rifx@outlook.com';
    const newPassword = 'English2024!';

    console.log('=== 更新生产环境密码 ===');
    console.log('使用直接数据库连接');

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ 用户不存在');
      return;
    }

    console.log('用户:', user.username);

    // 使用 12 rounds (与 lib/password.ts 一致)
    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash }
    });

    console.log('✓ 密码已更新');

    // 验证
    const updatedUser = await prisma.user.findUnique({
      where: { email }
    });

    const isValid = await bcrypt.compare(newPassword, updatedUser.passwordHash);
    console.log('✓ 验证结果:', isValid ? '成功' : '失败');

    console.log('\n=== 登录信息 ===');
    console.log('邮箱:', email);
    console.log('密码:', newPassword);
    console.log('登录: https://onsaylab.cn/login');

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePassword();
