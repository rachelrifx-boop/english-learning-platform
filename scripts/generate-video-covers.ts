import { prisma } from '../lib/prisma'
import { generateThumbnail } from '../lib/video-processor'
import path from 'path'

async function generateCoversForVideos() {
  try {
    console.log('开始为视频生成封面...\n')

    // 获取所有没有封面的视频
    const videos = await prisma.video.findMany({
      where: {
        OR: [
          { coverPath: null },
          { coverPath: '' }
        ]
      },
      select: {
        id: true,
        filePath: true,
        title: true,
        duration: true
      }
    })

    console.log(`找到 ${videos.length} 个没有封面的视频\n`)

    if (videos.length === 0) {
      console.log('所有视频都已有封面，无需处理')
      return
    }

    for (const video of videos) {
      try {
        console.log(`处理视频: ${video.title}`)

        // 构建完整的视频文件路径
        const videoPath = path.join(process.cwd(), 'public', video.filePath)

        // 生成封面文件名
        const coverFilename = `cover-${path.basename(video.filePath).replace('.mp4', '.jpg')}`
        const coverFilePath = path.join(process.cwd(), 'public', 'uploads', 'covers', coverFilename)

        // 使用视频的第1秒作为封面（如果视频很短，使用第0.5秒）
        const timestamp = video.duration > 5 ? 1 : 0.5

        console.log(`  - 从第 ${timestamp} 秒截取封面...`)

        // 生成封面
        await generateThumbnail(videoPath, coverFilePath, timestamp)

        // 更新数据库
        await prisma.video.update({
          where: { id: video.id },
          data: { coverPath: `/uploads/covers/${coverFilename}` }
        })

        console.log(`  ✓ 封面已生成: ${coverFilename}\n`)
      } catch (error: any) {
        console.error(`  ✗ 生成封面失败: ${error.message}\n`)
      }
    }

    console.log('所有视频封面生成完成！')
  } catch (error) {
    console.error('生成失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

generateCoversForVideos()
