#!/usr/bin/env node

/**
 * Vercel 部署测试脚本
 * 用于验证部署后的 API 是否正常工作
 */

const DEPLOYMENT_URL = 'https://english-learning-platform-rosy.vercel.app';

async function testAPI(endpoint, description) {
  const url = `${DEPLOYMENT_URL}${endpoint}`;
  console.log(`\n🔍 测试: ${description}`);
  console.log(`   URL: ${url}`);

  try {
    const response = await fetch(url);
    const status = response.status;
    const contentType = response.headers.get('content-type');

    console.log(`   状态码: ${status}`);
    console.log(`   Content-Type: ${contentType}`);

    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      console.log(`   响应:`, JSON.stringify(data, null, 2).split('\n').map(line => '   ' + line).join('\n'));
    } else {
      const text = await response.text();
      console.log(`   响应: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
    }

    if (status >= 200 && status < 300) {
      console.log(`   ✅ 成功`);
      return { success: true, status, data };
    } else if (status === 401) {
      console.log(`   ⚠️  需要认证 (这是正常的)`);
      return { success: true, status, data: '需要认证' };
    } else {
      console.log(`   ❌ 失败`);
      return { success: false, status, data };
    }
  } catch (error) {
    console.log(`   ❌ 错误:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Vercel 部署测试');
  console.log('部署地址:', DEPLOYMENT_URL);
  console.log('测试时间:', new Date().toISOString());
  console.log('='.repeat(60));

  const tests = [
    { endpoint: '/', description: '首页 (HTML)' },
    { endpoint: '/api/auth/me', description: '获取当前用户 (未登录)' },
    { endpoint: '/api/videos', description: '获取视频列表' },
    { endpoint: '/api/user/stats', description: '获取用户统计 (未登录)' },
    { endpoint: '/api/checkin', description: '获取打卡记录 (未登录)' },
  ];

  const results = [];

  for (const test of tests) {
    const result = await testAPI(test.endpoint, test.description);
    results.push({ ...test, result });
    // 添加延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('测试结果汇总');
  console.log('='.repeat(60));

  const successCount = results.filter(r => r.result.success).length;
  const failCount = results.filter(r => !r.result.success).length;

  results.forEach(({ description, result }) => {
    const icon = result.success ? '✅' : '❌';
    const status = result.status || 'N/A';
    console.log(`${icon} ${description} - ${status}`);
  });

  console.log('\n' + '-'.repeat(60));
  console.log(`总计: ${results.length} 个测试`);
  console.log(`成功: ${successCount} 个`);
  console.log(`失败: ${failCount} 个`);
  console.log('='.repeat(60));

  if (failCount > 0) {
    console.log('\n⚠️  注意: 某些 API 返回 401 是正常的，因为需要用户登录。');
    console.log('只有 500 错误才是需要关注的问题。\n');
  }

  process.exit(failCount > successCount ? 1 : 0);
}

main().catch(error => {
  console.error('测试脚本错误:', error);
  process.exit(1);
});
