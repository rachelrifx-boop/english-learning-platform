const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixDuration() {
  // 假设这个视频大约 10-15 分钟，设置为 600 秒
  await prisma.video.updateMany({
    where: { title: { contains: 'Sydney Serena' } },
    data: { duration: 600 }
  })

  const video = await prisma.video.findFirst({
    where: { title: { contains: 'Sydney Serena' } }
  })

  console.log('✓ 视频时长已更新为 10 分钟')
  console.log('视频 ID:', video.id)
  console.log('观看地址: http://localhost:3000/videos/' + video.id)
}

fixDuration().catch(console.error).finally(() => prisma.$disconnect())
