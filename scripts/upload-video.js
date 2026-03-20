const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

const prisma = new PrismaClient()

const VIDEO_PATH = 'C:/Users/DanDan/a week in my life vlog - Sydney Serena.mp4'
const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/videos')

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

async function getVideoDuration(filePath) {
  try {
    const { stdout } = await execAsync(`ffmpeg -i "${filePath}" -f null - 2>&1 | findstr "Duration"`)
    const match = stdout.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/)
    if (match) {
      const hours = parseInt(match[1])
      const minutes = parseInt(match[2])
      const seconds = parseFloat(match[3])
      return hours * 3600 + minutes * 60 + seconds
    }
    return 0
  } catch (error) {
    console.error('获取视频时长失败:', error.message)
    return 0
  }
}

async function uploadVideo() {
  console.log('开始上传视频...')
  console.log('视频路径:', VIDEO_PATH)

  // 检查文件是否存在
  if (!fs.existsSync(VIDEO_PATH)) {
    console.error('视频文件不存在！')
    return
  }

  // 1. 复制视频到 uploads 目录
  console.log('\n1. 复制视频文件...')
  const fileName = 'sydney-vlog-week.mp4'
  const destPath = path.join(UPLOAD_DIR, fileName)

  fs.copyFileSync(VIDEO_PATH, destPath)
  console.log('✓ 视频已复制到:', destPath)

  // 2. 获取视频时长
  console.log('\n2. 获取视频时长...')
  const duration = await getVideoDuration(VIDEO_PATH)
  console.log('✓ 视频时长:', Math.floor(duration / 60), '分', Math.floor(duration % 60), '秒')

  // 3. 创建数据库记录
  console.log('\n3. 创建数据库记录...')
  const video = await prisma.video.create({
    data: {
      title: 'A Week in My Life Vlog - Sydney Serena',
      description: 'Follow along with Sydney Serena as she shows you a week in her life. This vlog is perfect for English listening practice with natural, everyday conversation.',
      filePath: `/uploads/videos/${fileName}`,
      coverPath: null,
      duration: Math.round(duration),
      difficulty: 'B2',
      category: 'Vlog'
    }
  })
  console.log('✓ 视频记录已创建')
  console.log('  ID:', video.id)
  console.log('  标题:', video.title)

  console.log('\n=====================================')
  console.log('视频上传成功！')
  console.log('观看地址: http://localhost:3000/videos/' + video.id)
  console.log('=====================================')
}

uploadVideo()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
