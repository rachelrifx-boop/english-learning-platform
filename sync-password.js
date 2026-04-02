const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// 本地数据库
const LOCAL_DB_URL = "file:./dev.db";
// 生产数据库（连接池版本）
const PROD_DB_URL = "postgresql://postgres.cknvuclkzgylbmksfkfs:Raifxdd%2311ffr@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10";

const prismaLocal = new PrismaClient({
  datasources: {
    db: {
      url: LOCAL_DB_URL
    }
  }
});

const prismaProd = new PrismaClient({
  datasources: {
    db: {
      url: PROD_DB_URL
    }
  }
});

async function syncPassword() {
  try {
    const email = 'rachel-rifx@outlook.com';
    const testPassword = 'Test123456';
    const newPassword = 'Onsay2024'; // 设置一个新密码

    console.log('=== 同步本地和生产数据库密码 ===\n');

    // 1. 检查本地数据库
    console.log('1. 检查本地数据库...');
    const localUser = await prismaLocal.user.findUnique({
      where: { email }
    });

    if (localUser) {
      const localValid = await bcrypt.compare(testPassword, localUser.passwordHash);
      console.log('  本地用户存在:', localUser.username);
      console.log('  Test123456 验证:', localValid ? '✓ 成功' : '✗ 失败');
    } else {
      console.log('  本地用户不存在');
    }

    // 2. 检查生产数据库
    console.log('\n2. 检查生产数据库...');
    const prodUser = await prismaProd.user.findUnique({
      where: { email }
    });

    if (prodUser) {
      const prodValid = await bcrypt.compare(testPassword, prodUser.passwordHash);
      console.log('  生产用户存在:', prodUser.username);
      console.log('  Test123456 验证:', prodValid ? '✓ 成功' : '✗ 失败');
    } else {
      console.log('  生产用户不存在');
    }

    // 3. 生成新密码哈希
    console.log('\n3. 生成新密码哈希...');
    const newHash = await bcrypt.hash(newPassword, 10);
    console.log('  新密码:', newPassword);
    console.log('  新哈希:', newHash.substring(0, 30) + '...');

    // 4. 更新本地数据库
    if (localUser) {
      await prismaLocal.user.update({
        where: { id: localUser.id },
        data: { passwordHash: newHash }
      });
      console.log('\n  ✓ 本地数据库密码已更新');
    }

    // 5. 更新生产数据库
    if (prodUser) {
      await prismaProd.user.update({
        where: { id: prodUser.id },
        data: { passwordHash: newHash }
      });
      console.log('  ✓ 生产数据库密码已更新');
    }

    // 6. 验证更新
    console.log('\n4. 验证更新...');
    const verifyLocal = await prismaLocal.user.findUnique({ where: { email } });
    const verifyProd = await prismaProd.user.findUnique({ where: { email } });

    const localValid = await bcrypt.compare(newPassword, verifyLocal.passwordHash);
    const prodValid = await bcrypt.compare(newPassword, verifyProd.passwordHash);

    console.log('  本地验证:', localValid ? '✓ 成功' : '✗ 失败');
    console.log('  生产验证:', prodValid ? '✓ 成功' : '✗ 失败');

    console.log('\n=== 完成 ===');
    console.log('请使用以下信息登录:');
    console.log('邮箱:', email);
    console.log('密码:', newPassword);
    console.log('登录地址: https://onsaylab.cn/login');

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prismaLocal.$disconnect();
    await prismaProd.$disconnect();
  }
}

syncPassword();
