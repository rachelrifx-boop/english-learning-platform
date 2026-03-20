const { PrismaClient } = require('@prisma/client')
const path = require('path')
const fs = require('fs')

const prisma = new PrismaClient()

const COVER_DIR = path.join(process.cwd(), 'public/uploads/covers')

// 确保封面目录存在
if (!fs.existsSync(COVER_DIR)) {
  fs.mkdirSync(COVER_DIR, { recursive: true })
}

async function createDefaultCover() {
  console.log('创建默认视频封面...')

  try {
    // 获取所有视频
    const videos = await prisma.video.findMany({
      where: { coverPath: null }
    })

    console.log(`找到 ${videos.length} 个需要封面的视频`)

    for (const video of videos) {
      const coverFileName = `${video.id}.svg`
      const coverPath = path.join(COVER_DIR, coverFileName)

      // 创建一个简单的SVG作为封面
      const svgContent = `<svg width="854" height="480" xmlns="http://www.w3.org/2000/svg">
          <rect width="854" height="480" fill="#1e293b"/>
          <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" fill="#4F8EF7" text-anchor="middle" dominant-baseline="middle">
            ${video.title}
          </text>
          <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="16" fill="#94a3b8" text-anchor="middle" dominant-baseline="middle">
            ${video.difficulty} • ${video.category || '未分类'}
          </text>
        </svg>`

      // 保存SVG文件
      fs.writeFileSync(coverPath, svgContent)

      // 更新数据库
      await prisma.video.update({
        where: { id: video.id },
        data: {
          coverPath: `/uploads/covers/${coverFileName}`
        }
      })

      console.log(`✓ 已创建封面: ${video.title}`)
    }

    console.log('\n=====================================')
    console.log('默认封面创建完成！')
    console.log('=====================================')

  } catch (error) {
    console.error('创建封面失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createDefaultCover()
