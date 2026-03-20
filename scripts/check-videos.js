const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function checkVideos() {
  console.log('检查视频文件路径...\n')

  const videos = await prisma.video.findMany()

  console.log(`找到 ${videos.length} 个视频记录:\n`)

  for (const video of videos) {
    console.log(`视频 ID: ${video.id}`)
    console.log(`标题: ${video.title}`)
    console.log(`数据库路径: ${video.filePath}`)

    // 检查路径是否正确
    let needsUpdate = false
    let correctPath = video.filePath

    // 如果路径没有 /uploads/videos/ 前缀，添加它
    if (!video.filePath.startsWith('/uploads/videos/')) {
      const filename = path.basename(video.filePath)
      correctPath = `/uploads/videos/${filename}`
      needsUpdate = true
      console.log(`❌ 路径不正确，应该为: ${correctPath}`)
    } else {
      console.log(`✓ 路径格式正确`)
    }

    // 检查文件是否存在
    const fullPath = path.join(__dirname, '..', 'public', correctPath)
    const exists = fs.existsSync(fullPath)
    console.log(`文件存在: ${exists ? '✓' : '❌'}`)

    if (exists) {
      const stats = fs.statSync(fullPath)
      console.log(`文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)
    }

    console.log('---\n')

    // 更新数据库中的路径
    if (needsUpdate) {
      await prisma.video.update({
        where: { id: video.id },
        data: { filePath: correctPath }
      })
      console.log(`✓ 已更新数据库记录: ${correctPath}\n`)
    }
  }

  console.log('\n检查完成！')
}

checkVideos()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
