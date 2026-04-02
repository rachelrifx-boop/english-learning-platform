const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// 尝试使用 pgbouncer 连接池版本
const POOLER_DB_URL = "postgresql://postgres.cknvuclkzgylbmksfkfs:Raifxdd%2311ffr@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: POOLER_DB_URL
    }
  }
});

async function fixPasswordPooler() {
  try {
    const email = 'rachel-rifx@outlook.com';
    const testPassword = 'Test123456';

    console.log('=== 使用连接池连接 Supabase ===');
    console.log('连接字符串:', POOLER_DB_URL);

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ 用户不存在');
      return;
    }

    console.log('✓ 找到用户:', user.username);
    console.log('当前密码哈希:', user.passwordHash.substring(0, 30) + '...');

    // 生成新哈希
    const newHash = await bcrypt.hash(testPassword, 10);
    console.log('新密码哈希:', newHash.substring(0, 30) + '...');

    // 更新密码
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash }
    });

    console.log('✓ 密码已更新');

    // 验证
    const updatedUser = await prisma.user.findUnique({
      where: { email }
    });

    const isValid = await bcrypt.compare(testPassword, updatedUser.passwordHash);
    console.log(`✓ 验证结果: ${isValid ? '成功' : '失败'}`);

    console.log('\n=== 完成 ===');
    console.log('请使用以下信息登录:');
    console.log('邮箱:', email);
    console.log('密码:', testPassword);
    console.log('登录地址: https://onsaylab.cn/login');

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPasswordPooler();
