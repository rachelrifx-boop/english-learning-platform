import { prisma } from '../lib/prisma'
import { analyzeDifficulty } from '../lib/difficulty-analyzer'

async function analyzeAllVideos() {
  try {
    console.log('开始分析所有视频的难度...\n')

    // 获取所有有字幕的视频
    const videos = await prisma.video.findMany({
      include: {
        subtitles: {
          where: { language: 'EN' }
        }
      }
    })

    console.log(`找到 ${videos.length} 个视频\n`)

    for (const video of videos) {
      try {
        console.log(`处理视频: ${video.title}`)
        console.log(`  当前难度: ${video.difficulty}`)
        console.log(`  时长: ${video.duration} 秒`)

        // 检查是否有英文字幕
        if (!video.subtitles || video.subtitles.length === 0) {
          console.log(`  ⚠ 没有英文字幕，跳过\n`)
          continue
        }

        // 解析字幕内容
        const subtitleContent = video.subtitles[0].content
        let subtitles

        try {
          subtitles = typeof subtitleContent === 'string'
            ? JSON.parse(subtitleContent)
            : subtitleContent
        } catch (error) {
          console.log(`  ⚠ 字幕解析失败，跳过\n`)
          continue
        }

        if (!Array.isArray(subtitles) || subtitles.length === 0) {
          console.log(`  ⚠ 字幕格式不正确，跳过\n`)
          continue
        }

        // 分析难度
        const result = analyzeDifficulty(subtitles, video.duration)

        console.log(`  分析结果: ${result.level}`)
        console.log(`  置信度: ${result.confidence}`)
        console.log(`  词汇评分: ${result.details.vocabularyScore.toFixed(2)}`)
        console.log(`  句子评分: ${result.details.sentenceScore.toFixed(2)}`)
        console.log(`  语速评分: ${result.details.speedScore.toFixed(2)}`)
        console.log(`  时长评分: ${result.details.durationScore.toFixed(2)}`)

        // 更新数据库
        await prisma.video.update({
          where: { id: video.id },
          data: { difficulty: result.level }
        })

        console.log(`  ✓ 已更新难度: ${video.difficulty} → ${result.level}\n`)
      } catch (error: any) {
        console.error(`  ✗ 处理失败: ${error.message}\n`)
      }
    }

    console.log('所有视频难度分析完成！')
  } catch (error) {
    console.error('分析失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeAllVideos()
