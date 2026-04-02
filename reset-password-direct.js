const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const DATABASE_URL = "postgresql://postgres.cknvuclkzgylbmksfkfs:Raifxdd%2311ffr@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function resetPassword() {
  try {
    const email = 'rachel-rifx@outlook.com';
    const newPassword = 'Password123!';

    console.log('=== 重置密码 ===\n');

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ 用户不存在');
      return;
    }

    console.log('用户:', user.username, user.id);

    // 测试当前密码
    const testPasswords = ['Onsay2024!', 'Test123456', 'Password123!'];
    console.log('\n测试当前密码:');
    for (const pwd of testPasswords) {
      const isValid = await bcrypt.compare(pwd, user.passwordHash);
      console.log(`  "${pwd}": ${isValid ? '✓ 有效' : '✗ 无效'}`);
    }

    // 设置新密码 - 使用与修改密码API相同的方式 (12 rounds)
    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash }
    });

    console.log('\n✓ 密码已更新');

    // 验证新密码
    const updatedUser = await prisma.user.findUnique({
      where: { email }
    });

    const isValid = await bcrypt.compare(newPassword, updatedUser.passwordHash);
    console.log('✓ 新密码验证:', isValid ? '成功' : '失败');

    console.log('\n=== 请使用以下信息登录 ===');
    console.log('邮箱:', email);
    console.log('密码:', newPassword);
    console.log('\n登录地址:');
    console.log('- 生产环境: https://onsaylab.cn/login');
    console.log('- 本地环境: http://localhost:3000/login');

    console.log('\n提示：登录成功后，请在设置页面修改您自己的密码');
    console.log('设置地址: https://onsaylab.cn/settings');

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
