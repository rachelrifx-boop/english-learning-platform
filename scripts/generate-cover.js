const { PrismaClient } = require('@prisma/client')
const { exec } = require('child_process')
const { promisify } = require('util')
const path = require('path')
const fs = require('fs')

const execAsync = promisify(exec)
const prisma = new PrismaClient()

const VIDEO_DIR = path.join(process.cwd(), 'public/uploads/videos')
const COVER_DIR = path.join(process.cwd(), 'public/uploads/covers')

// 确保封面目录存在
if (!fs.existsSync(COVER_DIR)) {
  fs.mkdirSync(COVER_DIR, { recursive: true })
}

async function generateThumbnail(videoPath, outputPath) {
  try {
    // 使用ffmpeg从视频第3秒提取一帧作为封面
    // 转换路径格式
    const inputPath = videoPath.replace(/\\/g, '/')
    const outputPathFormatted = outputPath.replace(/\\/g, '/')
    const command = `ffmpeg -i "${inputPath}" -ss 00:00:03 -vframes 1 -vf "scale=854:480" -y "${outputPathFormatted}"`

    console.log('执行命令:', command)
    const { stdout, stderr } = await execAsync(command)
    console.log('输出:', stdout)
    if (stderr) console.log('错误信息:', stderr)
    return true
  } catch (error) {
    console.error('生成封面失败:', error.message)
    return false
  }
}

async function generateVideoCovers() {
  console.log('开始生成视频封面...')

  try {
    // 获取所有视频
    const videos = await prisma.video.findMany({
      where: { coverPath: null }
    })

    console.log(`找到 ${videos.length} 个需要生成封面的视频`)

    let successCount = 0
    let skipCount = 0

    for (const video of videos) {
      console.log(`\n处理视频: ${video.title}`)

      const videoPath = path.join(process.cwd(), 'public', video.filePath)
      const coverFileName = `${video.id}.jpg`
      const coverPath = path.join(COVER_DIR, coverFileName)

      // 检查视频文件是否存在
      if (!fs.existsSync(videoPath)) {
        console.log('  ✗ 视频文件不存在，跳过')
        skipCount++
        continue
      }

      console.log('  生成封面中...')
      const success = await generateThumbnail(videoPath, coverPath)

      if (success) {
        // 更新数据库
        await prisma.video.update({
          where: { id: video.id },
          data: {
            coverPath: `/uploads/covers/${coverFileName}`
          }
        })
        console.log('  ✓ 封面生成成功')
        successCount++
      } else {
        console.log('  ✗ 封面生成失败')
        skipCount++
      }
    }

    console.log('\n=====================================')
    console.log('封面生成完成！')
    console.log(`成功: ${successCount}`)
    console.log(`跳过: ${skipCount}`)
    console.log('=====================================')

  } catch (error) {
    console.error('生成封面失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

generateVideoCovers()
