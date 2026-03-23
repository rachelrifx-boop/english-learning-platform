import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 视频 "78" (vid_1774192338036_fx6bxgitpy) -> 1774192258631-jdqle8nmchm.mp4 -> 1480秒 (24分40秒)
  // 视频 "1" (vid_1774192227201_h7t2bkp5kq) -> 1774192209844-j0en6j70u3g.mp4 -> 86秒 (1分26秒)

  await prisma.video.update({
    where: { id: 'vid_1774192338036_fx6bxgitpy' },
    data: { duration: 1480 }
  })

  await prisma.video.update({
    where: { id: 'vid_1774192227201_h7t2bkp5kq' },
    data: { duration: 86 }
  })

  console.log('✓ 视频时长已更新')

  const videos = await prisma.video.findMany()
  console.log('当前视频列表:')
  videos.forEach(v => {
    console.log(`  ${v.title}: ${v.duration}秒 (${Math.floor(v.duration / 60)}分${v.duration % 60}秒)`)
  })
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
  })
