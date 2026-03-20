import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extractAudio, generateSubtitlesWithWhisper, generateSubtitlesWithGoogleCloud, translateSubtitleContent, cleanupAudio, srtTimeToMillis } from '@/lib/audio-processor'
import { generateSubtitlesWithLocalWhisper, WhisperModelSize } from '@/lib/local-whisper'
import { parseSubtitle, mergeSubtitles } from '@/lib/subtitle-parser'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// 确保 temp 目录存在
async function ensureTempDir() {
  const tempDir = path.join(process.cwd(), 'public', 'uploads', 'temp')
  if (!existsSync(tempDir)) {
    await mkdir(tempDir, { recursive: true })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 })
    }

    const { videoId, apiKey, speechService = 'local', modelSize = 'small' } = await request.json()

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: '缺少视频 ID' },
        { status: 400 }
      )
    }

    // 本地 Whisper 不需要 API Key
    if (speechService !== 'local' && !apiKey) {
      return NextResponse.json(
        { success: false, error: '缺少 API Key' },
        { status: 400 }
      )
    }

    // 解析 API Key
    // 格式 1 (OpenAI): "OpenAI Key,百度 APP_ID,SECRET_KEY"
    // 格式 2 (Google Cloud): "Google Cloud Key,百度 APP_ID,SECRET_KEY"
    // 格式 3 (本地 Whisper): "百度 APP_ID,SECRET_KEY" 或留空
    let baiduKey = ''
    let speechKey = ''

    if (speechService !== 'local' && apiKey) {
      const keys = apiKey.split(',').map(k => k.trim())
      speechKey = keys[0]
      baiduKey = keys[1] && keys[2] ? `${keys[1]},${keys[2]}` : keys[1] || ''
    } else if (apiKey) {
      // 本地 Whisper，只有百度翻译 Key
      baiduKey = apiKey
    }

    if (!baiduKey) {
      return NextResponse.json(
        { success: false, error: '缺少百度翻译 API Key（需要 APP_ID 和 SECRET_KEY）' },
        { status: 400 }
      )
    }

    // 获取视频信息
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { subtitles: true }
    })

    if (!video) {
      return NextResponse.json(
        { success: false, error: '视频不存在' },
        { status: 404 }
      )
    }

    // 检查是否已有英文字幕
    const hasEnglishSubtitle = video.subtitles.some(s => s.language === 'EN')
    if (hasEnglishSubtitle) {
      return NextResponse.json(
        { success: false, error: '该视频已有英文字幕' },
        { status: 400 }
      )
    }

    await ensureTempDir()

    // 1. 提取音频
    console.log('开始提取音频...')
    const videoPath = path.join(process.cwd(), 'public', video.filePath)
    const audioPath = await extractAudio(videoPath)
    console.log('音频提取完成:', audioPath)

    let englishContent = ''
    let chineseContent = ''

    try {
      // 2. 根据选择的语音服务生成英文字幕
      console.log('开始生成英文字幕...')

      if (speechService === 'local') {
        console.log('使用语音服务: 本地 Whisper')
        console.log('模型大小:', modelSize)
        englishContent = await generateSubtitlesWithLocalWhisper(audioPath, modelSize as WhisperModelSize)
      } else if (speechService === 'google') {
        console.log('使用语音服务: Google Cloud Speech-to-Text')
        englishContent = await generateSubtitlesWithGoogleCloud(audioPath, speechKey)
      } else {
        console.log('使用语音服务: OpenAI Whisper')
        englishContent = await generateSubtitlesWithWhisper(audioPath, speechKey)
      }
      console.log('英文字幕生成完成，长度:', englishContent.length)

      // 3. 使用百度翻译翻译为中文字幕
      console.log('开始翻译中文字幕...')
      chineseContent = await translateSubtitleContent(englishContent, baiduKey)
      console.log('中文字幕生成完成，长度:', chineseContent.length)

      // 4. 解析字幕格式
      const englishSegments = parseSubtitle(englishContent, 'whisper.srt')
      const chineseSegments = parseSubtitle(chineseContent, 'whisper-zh.srt')

      // 5. 保存字幕文件
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'subtitles')
      const enFilename = `whisper-${videoId}-en.srt`
      const zhFilename = `whisper-${videoId}-zh.srt`

      await writeFile(path.join(uploadsDir, enFilename), englishContent)
      await writeFile(path.join(uploadsDir, zhFilename), chineseContent)

      // 6. 合并双语字幕
      const merged = mergeSubtitles(englishSegments, chineseSegments)

      // 7. 保存到数据库
      await prisma.subtitle.create({
        data: {
          videoId: video.id,
          language: 'EN',
          content: JSON.stringify(merged),
          filePath: `/uploads/subtitles/${enFilename}`
        }
      })

      await prisma.subtitle.create({
        data: {
          videoId: video.id,
          language: 'ZH',
          content: JSON.stringify(chineseSegments),
          filePath: `/uploads/subtitles/${zhFilename}`
        }
      })

      console.log('字幕保存完成')

    } finally {
      // 8. 清理临时音频文件
      await cleanupAudio(audioPath)
      console.log('临时文件已清理')
    }

    return NextResponse.json({
      success: true,
      message: '字幕生成成功',
      data: {
        english: '英文字幕已生成',
        chinese: '中文字幕已生成'
      }
    })

  } catch (error: any) {
    console.error('生成字幕失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '生成字幕失败，请稍后重试'
      },
      { status: 500 }
    )
  }
}
