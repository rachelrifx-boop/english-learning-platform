#!/usr/bin/env node

// 检查环境变量配置
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET'
];

const optionalEnvVars = [
  'NEXT_PUBLIC_API_URL'
];

console.log('🔍 检查环境变量配置...\n');

let hasErrors = false;

// 检查必需的环境变量
console.log('必需的环境变量:');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const displayValue = varName === 'JWT_SECRET'
      ? `${value.substring(0, 8)}...`
      : value.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`❌ ${varName}: 未设置`);
    hasErrors = true;
  }
});

console.log('\n可选的环境变量:');
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`⚠️  ${varName}: 未设置（可选）`);
  }
});

if (hasErrors) {
  console.log('\n❌ 环境变量配置不完整！请在 Vercel 项目设置中配置所有必需的环境变量。');
  process.exit(1);
} else {
  console.log('\n✅ 所有必需的环境变量都已配置！');
  process.exit(0);
}
