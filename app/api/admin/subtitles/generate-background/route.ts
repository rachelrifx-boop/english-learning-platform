import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extractAudio, cleanupAudio } from '@/lib/audio-processor'
import { existsSync } from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'

// 状态文件目录
const STATUS_DIR = path.join(process.cwd(), 'public', 'uploads', 'temp')

// 更新状态
async function updateStatus(videoId: string, status: string, progress: number, message: string) {
  const statusFile = path.join(STATUS_DIR, `subtitle-status-${videoId}.json`)
  const data = {
    videoId,
    status,
    progress,
    message,
    timestamp: Date.now()
  }
  await writeFile(statusFile, JSON.stringify(data, null, 2))
}

// 从 R2 下载视频到本地临时文件
async function downloadVideoFromR2(key: string, videoId: string): Promise<string> {
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
    // 增加请求超时设置
    requestHandler: {
      requestTimeout: 900000, // 15分钟超时
      httpsAgent: undefined as any,
    },
  })

  const tempDir = path.join(process.cwd(), 'public', 'uploads', 'temp')
  const videoFilename = `video-${videoId}.mp4`
  const videoPath = path.join(tempDir, videoFilename)

  const command = new GetObjectCommand({
    Bucket: r2BucketName,
    Key: key,
  })

  console.log('[R2] 开始下载视频:', key)
  const startTime = Date.now()

  // 增加超时时间到 15 分钟
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('下载超时（15分钟）')), 900000)
  })

  try {
    const downloadPromise = (async () => {
      const response = await r2Client.send(command)
      const body = response.Body

      if (body instanceof Readable) {
        const chunks: Buffer[] = []
        let downloadedBytes = 0
        let lastProgressUpdate = 0

        for await (const chunk of body) {
          chunks.push(chunk)
          downloadedBytes += chunk.length

          // 每下载 5MB 或每5秒更新一次进度
          const now = Date.now()
          if (downloadedBytes % (5 * 1024 * 1024) < chunk.length || now - lastProgressUpdate > 5000) {
            const progress = Math.min(18, 15 + (downloadedBytes / (100 * 1024 * 1024)) * 3)
            await updateStatus(videoId, 'downloading', Math.round(progress), `下载中...${(downloadedBytes / (1024 * 1024)).toFixed(0)}MB`)
            lastProgressUpdate = now
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
    })()

    await Promise.race([downloadPromise, timeoutPromise])
    return videoPath
  } catch (error: any) {
    // 清理部分下载的文件
    if (existsSync(videoPath)) {
      try {
        await unlink(videoPath)
      } catch (e) {
        // ignore
      }
    }
    throw error
  }
}

// 启动后台字幕生成任务
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

    const { videoId, modelSize = 'small', baiduKey } = await request.json()

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: '缺少视频 ID' },
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

    // 确保目录存在
    if (!existsSync(STATUS_DIR)) {
      await mkdir(STATUS_DIR, { recursive: true })
    }

    // 初始化状态
    await updateStatus(videoId, 'starting', 0, '准备生成字幕...')

    // 立即返回，后台开始处理
    // 启动后台处理
    processInBackground(videoId, video.filePath, modelSize, baiduKey || '').catch(err => {
      console.error('[后台字幕生成] 错误:', err)
      updateStatus(videoId, 'error', 0, err.message)
    })

    return NextResponse.json({
      success: true,
      message: '字幕生成任务已启动',
      data: { videoId }
    })

  } catch (error: any) {
    console.error('启动字幕生成失败:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// 后台处理函数（不阻塞响应）
async function processInBackground(videoId: string, videoPath: string, modelSize: string, baiduKey: string) {
  let localVideoPath: string | null = null
  let downloadedVideo = false

  try {
    await updateStatus(videoId, 'downloading', 10, '获取视频文件...')

    // 首先尝试本地路径
    const localPath = path.join(process.cwd(), 'public', videoPath)
    if (existsSync(localPath)) {
      console.log('[后台] 使用本地视频文件:', localPath)
      localVideoPath = localPath
    } else {
      // 本地没有，从 R2 下载
      console.log('[后台] 本地无视频，开始从 R2 下载...')
      await updateStatus(videoId, 'downloading', 15, '从云端下载视频...')

      // 如果 videoPath 不以 videos/ 开头，添加前缀（因为 R2 中的 key 包含 videos/ 前缀）
      const r2Key = videoPath.startsWith('videos/') ? videoPath : `videos/${videoPath}`
      localVideoPath = await downloadVideoFromR2(r2Key, videoId)
      downloadedVideo = true
    }

    await updateStatus(videoId, 'extracting_audio', 20, '提取音频...')

    // 提取音频
    const audioPath = await extractAudio(localVideoPath)
    console.log('[后台] 音频提取完成:', audioPath)

    // 清理下载的视频文件
    if (downloadedVideo && localVideoPath && existsSync(localVideoPath)) {
      try {
        await unlink(localVideoPath)
        console.log('[后台] 临时视频文件已删除')
      } catch (e) {
        console.warn('[后台] 删除临时视频文件失败:', e)
      }
    }

    await updateStatus(videoId, 'transcribing', 30, 'AI 正在识别语音...')

    // 调用 Python Whisper
    const srtContent = await runWhisper(audioPath, modelSize)

    await updateStatus(videoId, 'translating', 70, '翻译中文字幕...')

    // 翻译中文字幕
    const { translateSubtitleContent } = await import('@/lib/audio-processor')
    let chineseContent = ''
    try {
      chineseContent = await translateSubtitleContent(srtContent, baiduKey)
    } catch (e) {
      console.warn('[后台] 翻译失败，仅保存英文字幕:', e)
      chineseContent = srtContent // 使用英文字幕作为后备
    }

    await updateStatus(videoId, 'saving', 90, '保存字幕...')

    // 解析字幕
    const { parseSubtitle, mergeSubtitles } = await import('@/lib/subtitle-parser')
    const englishSegments = parseSubtitle(srtContent, 'whisper.srt')
    const chineseSegments = parseSubtitle(chineseContent, 'whisper-zh.srt')

    // 保存字幕文件
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'subtitles')
    const enFilename = `whisper-${videoId}-en.srt`
    const zhFilename = `whisper-${videoId}-zh.srt`

    await writeFile(path.join(uploadsDir, enFilename), srtContent)
    await writeFile(path.join(uploadsDir, zhFilename), chineseContent)

    // 合并双语字幕
    const merged = mergeSubtitles(englishSegments, chineseSegments)

    // 保存到数据库
    await prisma.subtitle.create({
      data: {
        videoId: videoId,
        language: 'EN',
        content: JSON.stringify(merged),
        filePath: `/uploads/subtitles/${enFilename}`
      }
    })

    await prisma.subtitle.create({
      data: {
        videoId: videoId,
        language: 'ZH',
        content: JSON.stringify(chineseSegments),
        filePath: `/uploads/subtitles/${zhFilename}`
      }
    })

    // 自动分析并更新视频难度
    await updateStatus(videoId, 'analyzing', 95, '分析视频难度...')
    try {
      const { analyzeDifficulty } = await import('@/lib/difficulty-analyzer')

      // 获取视频时长
      const video = await prisma.video.findUnique({ where: { id: videoId } })
      if (video) {
        const difficultyResult = analyzeDifficulty(englishSegments, video.duration)

        console.log('[后台] 难度分析结果:', difficultyResult.level, '置信度:', difficultyResult.confidence)

        // 更新视频难度
        await prisma.video.update({
          where: { id: videoId },
          data: { difficulty: difficultyResult.level }
        })

        console.log('[后台] 视频难度已更新为:', difficultyResult.level)
      }
    } catch (error) {
      console.warn('[后台] 难度分析失败，继续使用默认难度:', error)
    }

    // 清理临时文件
    await cleanupAudio(audioPath)

    await updateStatus(videoId, 'completed', 100, '字幕生成完成！')

    console.log('[后台] 字幕生成完成:', videoId)

  } catch (error: any) {
    console.error('[后台] 字幕生成失败:', error)

    // 清理下载的临时视频文件
    if (downloadedVideo && localVideoPath && existsSync(localVideoPath)) {
      try {
        await unlink(localVideoPath)
      } catch (e) {
        // ignore
      }
    }

    await updateStatus(videoId, 'error', 0, error.message)
  }
}

// 运行 Whisper（返回 Promise）
function runWhisper(audioPath: string, modelSize: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'whisper-transcribe.py')

    const env = {
      ...process.env,
      WHISPER_CACHE_DIR: 'D:\\WhisperModels',
      HF_ENDPOINT: 'https://hf-mirror.com'
    }

    const python = spawn('python', [scriptPath, audioPath, modelSize], {
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    python.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    python.stderr.on('data', (data) => {
      stderr += data.toString()
      const line = data.toString().trim()
      if (line) {
        console.log(`[Whisper] ${line}`)
      }
    })

    python.on('close', (code) => {
      if (code === 0) {
        const srtContent = stdout.trim()
        if (srtContent) {
          resolve(srtContent)
        } else {
          reject(new Error('字幕生成失败：输出为空'))
        }
      } else {
        reject(new Error(`字幕生成失败，退出码: ${code}\n${stderr}`))
      }
    })

    python.on('error', (error) => {
      reject(new Error(`无法启动 Python: ${error.message}`))
    })
  })
}
