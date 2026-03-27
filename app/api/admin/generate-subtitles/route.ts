import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extractAudio, generateSubtitlesWithWhisper, generateSubtitlesWithGoogleCloud, translateSubtitleContent, cleanupAudio, srtTimeToMillis } from '@/lib/audio-processor'
import { generateSubtitlesWithLocalWhisper, WhisperModelSize } from '@/lib/local-whisper'
import { parseSubtitle, mergeSubtitles } from '@/lib/subtitle-parser'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'

// 确保 temp 目录存在
async function ensureTempDir() {
  const tempDir = path.join(process.cwd(), 'public', 'uploads', 'temp')
  if (!existsSync(tempDir)) {
    await mkdir(tempDir, { recursive: true })
  }
}

// 从 R2 下载视频到本地临时文件（带超时和进度）
async function downloadVideoFromR2(key: string): Promise<string> {
  const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos'

  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
    throw new Error('R2 配置不完整')
  }

  const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
    requestHandler: {
      requestTimeout: 300000, // 5 分钟超时
      httpsAgent: undefined,
    },
  })

  const tempDir = path.join(process.cwd(), 'public', 'uploads', 'temp')
  const videoFilename = `video-${Date.now()}.mp4`
  const videoPath = path.join(tempDir, videoFilename)

  const command = new GetObjectCommand({
    Bucket: r2BucketName,
    Key: key,
  })

  console.log('[R2] 开始下载视频:', key)
  const startTime = Date.now()

  const response = await r2Client.send(command)
  const body = response.Body

  if (body instanceof Readable) {
    // Node.js Readable stream
    const chunks: Buffer[] = []
    let downloadedBytes = 0

    for await (const chunk of body) {
      chunks.push(chunk)
      downloadedBytes += chunk.length
      // 每下载 10MB 输出一次进度
      if (downloadedBytes % (10 * 1024 * 1024) < chunk.length) {
        console.log(`[R2] 下载进度: ${(downloadedBytes / (1024 * 1024)).toFixed(1)}MB`)
      }
    }
    const buffer = Buffer.concat(chunks)
    await writeFile(videoPath, buffer)
  } else {
    throw new Error('无法读取 R2 响应流')
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`[R2] 视频下载完成: ${videoPath} (耗时 ${elapsed}秒)`)
  return videoPath
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
      const keys = apiKey.split(',').map((k: string) => k.trim())
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

    // 1. 获取视频文件（优先使用本地文件）
    console.log('准备获取视频文件...')
    let localVideoPath: string | null = null

    // 首先尝试本地路径
    const localPath = path.join(process.cwd(), 'public', video.filePath)
    if (existsSync(localPath)) {
      console.log('[INFO] 使用本地视频文件:', localPath)
      localVideoPath = localPath
    } else {
      // 本地没有，尝试从 R2 下载
      console.log('[INFO] 本地无视频文件，开始从 R2 下载...')
      try {
        // 如果 filePath 不以 videos/ 开头，添加前缀
        const r2Key = video.filePath.startsWith('videos/') ? video.filePath : `videos/${video.filePath}`
        localVideoPath = await downloadVideoFromR2(r2Key)
      } catch (e: any) {
        console.error('[ERROR] R2 下载失败:', e.message)
        throw new Error(`无法获取视频文件: ${e.message}`)
      }
    }

    if (!localVideoPath || !existsSync(localVideoPath)) {
      throw new Error('视频文件不存在，无法提取音频')
    }

    // 2. 提取音频
    console.log('开始提取音频...')
    const audioPath = await extractAudio(localVideoPath)
    console.log('音频提取完成:', audioPath)

    // 3. 清理下载的视频文件（如果是临时文件）
    if (localVideoPath && !localVideoPath.includes('public') && existsSync(localVideoPath)) {
      try {
        await unlink(localVideoPath)
        console.log('临时视频文件已清理')
      } catch (e) {
        console.log('清理视频文件失败:', e)
      }
    }

    let englishContent = ''
    let chineseContent = ''

    try {
      // 4. 根据选择的语音服务生成英文字幕
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
