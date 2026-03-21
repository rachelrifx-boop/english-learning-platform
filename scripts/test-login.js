const bcrypt = require('bcryptjs');
const { SignJWT } = require('jose');

const JWT_SECRET = 'e84c71dd040c771717b0619634a65e7b6bfd88cdfcc6bab38a09b5ecf86f5011';

async function testLogin() {
  console.log('测试登录功能...\n');

  // 测试密码验证
  const password = 'yddhb908';
  const hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

  console.log('测试密码：', password);
  console.log('密码哈希：', hash.substring(0, 20) + '...');

  const isValid = await bcrypt.compare(password, hash);
  console.log('密码验证结果：', isValid ? '✅ 正确' : '❌ 错误');

  // 测试JWT生成
  console.log('\n测试JWT生成...');
  console.log('JWT_SECRET:', JWT_SECRET);

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const token = await new SignJWT({
      userId: 'test-id',
      email: 'rachelrifx@gmail.com',
      role: 'ADMIN'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    console.log('✅ JWT生成成功');
    console.log('Token:', token.substring(0, 50) + '...');
  } catch (error) {
    console.error('❌ JWT生成失败:', error.message);
  }

  console.log('\n✅ 测试完成');
}

testLogin();
