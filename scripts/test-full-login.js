const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { SignJWT } = require('jose');

const DATABASE_URL = 'postgresql://postgres:Raifxdd%2311ffr@db.cknvuclkzgylbmksfkfs.supabase.co:5432/postgres';
const JWT_SECRET = 'e84c71dd040c771717b0619634a65e7b6bfd88cdfcc6bab38a09b5ecf86f5011';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function testFullLogin() {
  console.log('完整登录流程测试...\n');

  const email = 'rachelrifx@gmail.com';
  const password = 'yddhb908';

  try {
    // 步骤1：查找用户
    console.log('步骤1：查找用户...');
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ 用户不存在');
      return;
    }
    console.log('✅ 找到用户:', user.username);

    // 步骤2：验证密码
    console.log('\n步骤2：验证密码...');
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      console.log('❌ 密码错误');
      return;
    }
    console.log('✅ 密码正确');

    // 步骤3：生成JWT
    console.log('\n步骤3：生成JWT token...');
    console.log('用户ID:', user.id);
    console.log('邮箱:', user.email);
    console.log('角色:', user.role);

    const secret = new TextEncoder().encode(JWT_SECRET);
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    console.log('✅ JWT生成成功');
    console.log('Token (前50字符):', token.substring(0, 50) + '...');

    // 步骤4：验证Token格式
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('❌ Token格式错误');
    } else {
      console.log('✅ Token格式正确 (3 parts)');
      console.log('  Header:', parts[0]);
      console.log('  Payload:', parts[1].substring(0, 50) + '...');
      console.log('  Signature:', parts[2].substring(0, 30) + '...');
    }

    console.log('\n✅ 登录流程测试完成！');
    console.log('\n模拟响应：');
    console.log(JSON.stringify({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role
        }
      }
    }, null, 2));

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error('堆栈:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testFullLogin();
