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

  console.log('[BATCH UPDATE] 开始下载视频:', key)
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
  console.log(`[BATCH UPDATE] 视频下载完成 (耗时 ${elapsed}秒)`)
  return videoPath
}

// 使用 ffprobe 获取视频时长（带重试机制）
async function getVideoDuration(videoPath: string, videoId: string, retries = 2): Promise<number | null> {
  let localVideoPath: string | null = null
  let downloadedVideo = false
  let lastError: any = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // 首先尝试本地路径
      const localPath = path.join(process.cwd(), 'public', videoPath)
      if (existsSync(localPath)) {
        console.log('[BATCH UPDATE] 使用本地视频文件')
        localVideoPath = localPath
      } else {
        // 本地没有，从 R2 下载
        console.log(`[BATCH UPDATE] 本地无视频，从 R2 下载... (尝试 ${attempt + 1}/${retries + 1})`)
        // 如果 videoPath 不以 videos/ 开头，添加前缀
        const r2Key = videoPath.startsWith('videos/') ? videoPath : `videos/${videoPath}`
        localVideoPath = await downloadVideoFromR2(r2Key, videoId)
        downloadedVideo = true
      }

      console.log('[BATCH UPDATE] 使用 ffprobe 获取时长:', localVideoPath)

      const command = `"C:\\ffmpeg\\bin\\ffprobe.exe" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${localVideoPath}"`
      const { stdout } = await execAsync(command, { timeout: 120000 })

      const duration = parseFloat(stdout.trim())
      if (isNaN(duration)) {
        console.error('[BATCH UPDATE] ffprobe 返回无效时长:', stdout)
        lastError = new Error(`ffprobe 返回无效时长: ${stdout}`)
        // 继续重试
        continue
      }

      console.log(`[BATCH UPDATE] 成功获取时长: ${Math.round(duration)}秒`)
      return Math.round(duration)
    } catch (error: any) {
      lastError = error
      console.error(`[BATCH UPDATE] 获取视频时长失败 (尝试 ${attempt + 1}/${retries + 1}):`, error?.message || error)

      // 清理可能残留的临时文件
      if (downloadedVideo && localVideoPath && existsSync(localVideoPath)) {
        try {
          await unlink(localVideoPath)
          console.log('[BATCH UPDATE] 清理临时视频文件')
        } catch (e) {
          // 忽略清理错误
        }
      }

      localVideoPath = null
      downloadedVideo = false

      // 如果不是最后一次尝试，等待一下再重试
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } finally {
      // 清理下载的临时视频文件
      if (downloadedVideo && localVideoPath && existsSync(localVideoPath)) {
        try {
          await unlink(localVideoPath)
          console.log('[BATCH UPDATE] 临时视频文件已删除')
        } catch (e) {
          console.warn('[BATCH UPDATE] 删除临时视频文件失败:', e)
        }
      }
    }
  }

  // 所有尝试都失败了
  console.error('[BATCH UPDATE] 所有重试都失败，最后错误:', lastError?.message)
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

    // 获取所有视频
    const videos = await prisma.video.findMany({
      select: { id: true, title: true, duration: true, filePath: true }
    })

    console.log(`[BATCH UPDATE] 开始批量更新 ${videos.length} 个视频的时长`)

    const results = []
    let successCount = 0
    let failCount = 0

    for (const video of videos) {
      console.log(`[BATCH UPDATE] 处理: ${video.title}`)

      const actualDuration = await getVideoDuration(video.filePath, video.id)

      if (actualDuration !== null && actualDuration !== video.duration) {
        await prisma.video.update({
          where: { id: video.id },
          data: { duration: actualDuration }
        })

        results.push({
          id: video.id,
          title: video.title,
          oldDuration: video.duration,
          newDuration: actualDuration,
          status: 'updated'
        })

        successCount++
        console.log(`[BATCH UPDATE] ✓ ${video.title}: ${video.duration}s -> ${actualDuration}s`)
      } else if (actualDuration !== null) {
        results.push({
          id: video.id,
          title: video.title,
          duration: actualDuration,
          status: 'unchanged'
        })
        console.log(`[BATCH UPDATE] - ${video.title}: 时长正确 (${actualDuration}s)`)
      } else {
        results.push({
          id: video.id,
          title: video.title,
          status: 'failed'
        })
        failCount++
        console.log(`[BATCH UPDATE] ✗ ${video.title}: 获取失败`)
      }

      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    return NextResponse.json({
      success: true,
      message: `批量更新完成: ${successCount} 个已更新, ${videos.length - successCount - failCount} 个无需更新, ${failCount} 个失败`,
      data: { results, summary: { successCount, failCount, total: videos.length } }
    })
  } catch (error: any) {
    console.error('[BATCH UPDATE] Error:', error)

    // 提供更详细的错误信息
    let errorMessage = '批量更新视频时长失败'
    if (error?.message) {
      errorMessage += `: ${error.message}`
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}
