import { prisma } from '../lib/prisma'
import { getVideoInfo } from '../lib/video-processor'
import path from 'path'

async function updateVideoDurations() {
  try {
    console.log('开始更新视频时长...')

    // 获取所有视频
    const videos = await prisma.video.findMany({
      select: {
        id: true,
        filePath: true,
        title: true,
        duration: true
      }
    })

    console.log(`找到 ${videos.length} 个视频`)

    for (const video of videos) {
      try {
        // 构建完整的文件路径
        const fullPath = path.join(process.cwd(), 'public', video.filePath)

        console.log(`\n处理视频: ${video.title}`)
        console.log(`当前时长: ${video.duration} 秒`)

        // 获取实际时长
        const info = await getVideoInfo(fullPath)
        const actualDuration = Math.round(info.duration)

        console.log(`实际时长: ${actualDuration} 秒`)

        // 如果时长差异超过 5 秒，则更新
        if (Math.abs(actualDuration - video.duration) > 5) {
          await prisma.video.update({
            where: { id: video.id },
            data: { duration: actualDuration }
          })
          console.log(`✓ 已更新视频时长: ${video.duration} -> ${actualDuration}`)
        } else {
          console.log(`○ 时长正确，无需更新`)
        }
      } catch (error: any) {
        console.error(`✗ 处理视频 ${video.title} 失败:`, error.message)
      }
    }

    console.log('\n所有视频时长更新完成！')
  } catch (error) {
    console.error('更新失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateVideoDurations()
