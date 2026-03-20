const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SUBTITLE_PATH = 'C:/Users/DanDan/Downloads/a week in my life vlog - Sydney Serena (720p, h264, youtube).srt'
const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/subtitles')

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// 解析 SRT 字幕
function parseSRT(content) {
  const segments = []
  const lines = content.split('\n')

  let i = 0
  while (i < lines.length) {
    // 跳过空行
    if (lines[i].trim() === '') {
      i++
      continue
    }

    // 字幕序号
    const index = parseInt(lines[i].trim())
    i++
    if (isNaN(index)) continue

    // 时间戳行
    if (i >= lines.length) break
    const timeLine = lines[i].trim()
    i++

    // 时间戳匹配
    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/)
    if (!timeMatch) continue

    const startTime = parseSRTTime(timeMatch[1])
    const endTime = parseSRTTime(timeMatch[2])

    // 收集文本行
    const textLines = []
    while (i < lines.length && lines[i].trim() !== '') {
      const line = lines[i].trim()
      // 过滤掉 ERROR 行和空行
      if (line !== 'ERROR' && line !== '') {
        textLines.push(line)
      }
      i++
    }

    const text = textLines.join(' ').replace(/<[^>]+>/g, '') // 移除 HTML 标签

    if (text) {
      segments.push({
        id: index,
        startTime,
        endTime,
        text
      })
    }
  }

  return segments
}

function parseSRTTime(timeString) {
  const [time, milliseconds] = timeString.split(',')
  const [hours, minutes, seconds] = time.split(':').map(Number)
  return hours * 3600000 + minutes * 60000 + seconds * 1000 + parseInt(milliseconds)
}

async function uploadSubtitle() {
  console.log('开始上传字幕...')

  // 1. 读取字幕文件
  console.log('\n1. 读取字幕文件...')
  const content = fs.readFileSync(SUBTITLE_PATH, 'utf8')
  console.log('✓ 字幕文件已读取')

  // 2. 解析字幕
  console.log('\n2. 解析字幕内容...')
  const segments = parseSRT(content)
  console.log('✓ 解析完成，共', segments.length, '条字幕')

  // 3. 复制字幕文件到 uploads 目录
  console.log('\n3. 复制字幕文件...')
  const fileName = 'sydney-vlog-week-en.srt'
  const destPath = path.join(UPLOAD_DIR, fileName)
  fs.copyFileSync(SUBTITLE_PATH, destPath)
  console.log('✓ 字幕文件已复制')

  // 4. 获取视频ID
  console.log('\n4. 查找视频...')
  const video = await prisma.video.findFirst({
    where: { title: { contains: 'Sydney Serena' } }
  })

  if (!video) {
    console.error('✗ 视频不存在！')
    return
  }
  console.log('✓ 找到视频:', video.title)

  // 5. 删除旧的英文字幕（如果存在）
  await prisma.subtitle.deleteMany({
    where: { videoId: video.id, language: 'EN' }
  })

  // 6. 创建字幕记录
  console.log('\n5. 保存字幕到数据库...')
  await prisma.subtitle.create({
    data: {
      videoId: video.id,
      language: 'EN',
      content: JSON.stringify(segments),
      filePath: `/uploads/subtitles/${fileName}`
    }
  })
  console.log('✓ 字幕已保存到数据库')

  console.log('\n=====================================')
  console.log('字幕上传成功！')
  console.log('视频地址: http://localhost:3000/videos/' + video.id)
  console.log('=====================================')

  // 显示前5条字幕示例
  console.log('\n字幕预览（前5条）:')
  segments.slice(0, 5).forEach(seg => {
    const startTime = (seg.startTime / 1000).toFixed(2)
    console.log(`  [${startTime}s] ${seg.text}`)
  })
}

uploadSubtitle()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
