import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import path from 'path'
import { writeFile, unlink } from 'fs/promises'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'

const execAsync = promisify(exec)

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
  })

  const tempDir = path.join(process.cwd(), 'public', 'uploads', 'temp')
  const videoFilename = `duration-${videoId}.mp4`
  const videoPath = path.join(tempDir, videoFilename)

  const command = new GetObjectCommand({
    Bucket: r2BucketName,
    Key: key,
  })

  console.log('[UPDATE DURATION] 开始下载视频:', key)
  const startTime = Date.now()

  const response = await r2Client.send(command)
  const body = response.Body

  if (body instanceof Readable) {
    const chunks: Buffer[] = []
    for await (const chunk of body) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    await writeFile(videoPath, buffer)
  } else {
    throw new Error('无法读取 R2 响应流')
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`[UPDATE DURATION] 视频下载完成 (耗时 ${elapsed}秒)`)
  return videoPath
}

// 使用 ffprobe 获取视频时长（带重试机制）
async function getVideoDuration(videoPath: string, videoId: string): Promise<number | null> {
  let localVideoPath: string | null = null
  let downloadedVideo = false
  let lastError: any = null

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      // 强制从 R2 下载，因为本地没有存储视频文件
      console.log(`[UPDATE DURATION] 从 R2 下载视频... (尝试 ${attempt + 1}/3)`)
      // 如果 videoPath 不以 videos/ 开头，添加前缀
      const r2Key = videoPath.startsWith('videos/') ? videoPath : `videos/${videoPath}`
      localVideoPath = await downloadVideoFromR2(r2Key, videoId)
      downloadedVideo = true

      console.log('[UPDATE DURATION] 使用 ffprobe 获取时长:', localVideoPath)

      const command = `"C:\\ffmpeg\\bin\\ffprobe.exe" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${localVideoPath}"`
      const { stdout } = await execAsync(command, { timeout: 120000 })

      const duration = parseFloat(stdout.trim())
      if (isNaN(duration)) {
        console.error('[UPDATE DURATION] ffprobe 返回无效时长:', stdout)
        lastError = new Error(`ffprobe 返回无效时长: ${stdout}`)
        // 继续重试
        continue
      }

      console.log(`[UPDATE DURATION] 成功获取时长: ${Math.round(duration)}秒`)
      return Math.round(duration)
    } catch (error: any) {
      lastError = error
      console.error(`[UPDATE DURATION] 获取视频时长失败 (尝试 ${attempt + 1}/3):`, error?.message || error)

      // 清理可能残留的临时文件
      if (downloadedVideo && localVideoPath && existsSync(localVideoPath)) {
        try {
          await unlink(localVideoPath)
          console.log('[UPDATE DURATION] 清理临时视频文件')
        } catch (e) {
          // 忽略清理错误
        }
      }

      localVideoPath = null
      downloadedVideo = false

      // 如果不是最后一次尝试，等待一下再重试
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } finally {
      // 清理下载的临时视频文件
      if (downloadedVideo && localVideoPath && existsSync(localVideoPath)) {
        try {
          await unlink(localVideoPath)
          console.log('[UPDATE DURATION] 临时视频文件已删除')
        } catch (e) {
          console.warn('[UPDATE DURATION] 删除临时视频文件失败:', e)
        }
      }
    }
  }

  // 所有尝试都失败了
  console.error('[UPDATE DURATION] 所有重试都失败，最后错误:', lastError?.message)
  return null
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
      return NextResponse.json({ success: false, error: '无权访问' }, { status: 403 })
    }

    const body = await request.json()
    const { videoId } = body

    if (!videoId) {
      return NextResponse.json({ success: false, error: '请提供视频ID' }, { status: 400 })
    }

    // 获取视频记录
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    })

    if (!video) {
      return NextResponse.json({ success: false, error: '视频不存在' }, { status: 404 })
    }

    console.log('[UPDATE DURATION] 开始更新视频时长:', video.title)
    console.log('[UPDATE DURATION] 当前时长:', video.duration, '秒')
    console.log('[UPDATE DURATION] 文件路径:', video.filePath)

    // 获取实际视频时长
    const actualDuration = await getVideoDuration(video.filePath, video.id)

    if (actualDuration === null) {
      return NextResponse.json(
        { success: false, error: '无法获取视频时长，请检查视频文件是否存在' },
        { status: 500 }
      )
    }

    // 更新数据库
    await prisma.video.update({
      where: { id: videoId },
      data: { duration: actualDuration }
    })

    console.log('[UPDATE DURATION] 时长已更新:', actualDuration, '秒')

    return NextResponse.json({
      success: true,
      data: {
        oldDuration: video.duration,
        newDuration: actualDuration,
        formatted: `${Math.floor(actualDuration / 60)}:${(actualDuration % 60).toString().padStart(2, '0')}`
      }
    })
  } catch (error: any) {
    console.error('[UPDATE DURATION] Error:', error)
    return NextResponse.json(
      { success: false, error: '更新视频时长失败' },
      { status: 500 }
    )
  }
}
