const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const DATABASE_URL = 'postgresql://postgres:Raifxdd%2311ffr@db.cknvuclkzgylbmksfkfs.supabase.co:5432/postgres';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function testRealPassword() {
  console.log('测试真实用户密码...\n');

  const password = 'yddhb908';

  // 获取真实用户
  const user = await prisma.user.findUnique({
    where: { email: 'rachelrifx@gmail.com' }
  });

  if (!user) {
    console.log('❌ 用户不存在');
    return;
  }

  console.log('用户：', user.username);
  console.log('邮箱：', user.email);
  console.log('密码哈希：', user.passwordHash);

  // 测试密码验证
  const isValid = await bcrypt.compare(password, user.passwordHash);
  console.log('\n密码验证结果：', isValid ? '✅ 正确' : '❌ 错误');

  if (!isValid) {
    console.log('\n尝试重新哈希密码...');

    // 重新创建密码哈希
    const newHash = await bcrypt.hash(password, 10);
    console.log('新哈希：', newHash);

    // 验证新哈希
    const isNewValid = await bcrypt.compare(password, newHash);
    console.log('新哈希验证：', isNewValid ? '✅ 正确' : '❌ 错误');

    // 更新数据库
    await prisma.user.update({
      where: { email: 'rachelrifx@gmail.com' },
      data: { passwordHash: newHash }
    });

    console.log('✅ 密码已更新到数据库');

    // 再次验证
    const updatedUser = await prisma.user.findUnique({
      where: { email: 'rachelrifx@gmail.com' }
    });

    const finalCheck = await bcrypt.compare(password, updatedUser.passwordHash);
    console.log('最终验证：', finalCheck ? '✅ 正确' : '❌ 错误');
  }

  await prisma.$disconnect();
  console.log('\n✅ 测试完成');
}

testRealPassword();
