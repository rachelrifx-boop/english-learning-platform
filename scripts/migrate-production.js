const { execSync } = require('child_process');

console.log('开始数据库迁移...\n');

try {
  // 生成 Prisma Client
  console.log('1. 生成 Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // 推送数据库 schema
  console.log('\n2. 推送数据库 schema 到 Supabase...');
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });

  console.log('\n✅ 数据库迁移完成！');
} catch (error) {
  console.error('\n❌ 迁移失败:', error.message);
  process.exit(1);
}
