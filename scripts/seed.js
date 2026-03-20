const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function seed() {
  console.log('开始初始化数据库...')

  // 1. 创建邀请码
  const inviteCode = await prisma.inviteCode.upsert({
    where: { code: 'WELCOME2025' },
    update: {},
    create: {
      code: 'WELCOME2025',
      maxUses: 100,
      usedCount: 0
    }
  })
  console.log('✓ 邀请码创建成功:', inviteCode.code)

  // 2. 创建管理员账户
  const hashedPassword = await bcrypt.hash('admin123', 12)

  // 先检查是否已存在管理员
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })

  if (existingAdmin) {
    console.log('✓ 管理员账户已存在:', existingAdmin.email)
  } else {
    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        username: 'Admin',
        passwordHash: hashedPassword,
        role: 'ADMIN',
        inviteCodeId: inviteCode.id
      }
    })
    console.log('✓ 管理员账户创建成功')
    console.log('  邮箱: admin@example.com')
    console.log('  密码: admin123')
  }

  console.log('\n初始化完成！')
  console.log('=====================================')
  console.log('登录信息:')
  console.log('  邮箱: admin@example.com')
  console.log('  密码: admin123')
  console.log('  管理后台: http://localhost:3000/admin')
  console.log('=====================================')
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
