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

async function setPassword() {
  try {
    const email = 'rachel-rifx@outlook.com';
    const newPassword = 'Onsay2024!';

    console.log('=== 设置新密码 ===');

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ 用户不存在');
      return;
    }

    // 生成新哈希
    const newHash = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash }
    });

    // 验证
    const updatedUser = await prisma.user.findUnique({
      where: { email }
    });

    const isValid = await bcrypt.compare(newPassword, updatedUser.passwordHash);

    console.log('✓ 密码已更新');
    console.log('✓ 验证结果:', isValid ? '成功' : '失败');

    console.log('\n=== 登录信息 ===');
    console.log('邮箱:', email);
    console.log('密码:', newPassword);
    console.log('登录地址: https://onsaylab.cn/login');
    console.log('本地地址: http://localhost:3000/login');

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setPassword();
