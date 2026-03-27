import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { exec } from 'child_process'
import { promisify } from 'util'
import { randomBytes } from 'crypto'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import { writeFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const execAsync = promisify(exec)

// R2 配置
const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos'

// 创建 R2 客户端
let r2Client: S3Client | null = null
if (r2AccountId && r2AccessKeyId && r2SecretAccessKey) {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  })
}

// 从 R2 下载视频
async function downloadVideoFromR2(key: string): Promise<Buffer> {
  if (!r2Client) {
    throw new Error('R2 未配置')
  }

  const command = new GetObjectCommand({
    Bucket: r2BucketName,
    Key: key,
  })

  console.log('[EXTRACT COVER] 开始下载视频:', key)
  const startTime = Date.now()

  const response = await r2Client.send(command)
  const body = response.Body

  if (!body) {
    throw new Error('无法读取 R2 响应')
  }

  const chunks: Buffer[] = []
  if (body instanceof Readable) {
    for await (const chunk of body) {
      chunks.push(chunk)
    }
  } else {
    throw new Error('无法读取 R2 响应流')
  }

  const buffer = Buffer.concat(chunks)
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`[EXTRACT COVER] 视频下载完成 (耗时 ${elapsed}秒, 大小 ${(buffer.length / 1024 / 1024).toFixed(2)}MB)`)

  return buffer
}

// 上传封面到 R2
async function uploadCoverToR2(buffer: Buffer, fileName: string): Promise<{ url: string | null, error?: string }> {
  if (!r2Client) {
    return { url: null, error: 'R2 未配置' }
  }

  try {
    const key = `covers/${fileName}`
    const command = new PutObjectCommand({
      Bucket: r2BucketName,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
    })

    await r2Client.send(command)

    // 返回相对路径作为 URL
    return { url: key }
  } catch (error: any) {
    console.error('[EXTRACT COVER] R2 上传失败:', error)
    return { url: null, error: error.message }
  }
}

// 从视频截取首帧作为封面
export async function POST(request: NextRequest) {
  let tempVideoPath: string | null = null
  let tempCoverPath: string | null = null

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
    const { videoUrl } = body

    if (!videoUrl) {
      return NextResponse.json({ success: false, error: '请提供视频URL' }, { status: 400 })
    }

    console.log('[EXTRACT COVER] 开始截取视频首帧:', videoUrl)

    // 处理 videoUrl，获取 R2 key
    let r2Key = videoUrl
    if (videoUrl.startsWith('covers/') || videoUrl.startsWith('videos/')) {
      r2Key = videoUrl
    } else {
      r2Key = `videos/${videoUrl}`
    }

    // 生成临时文件路径
    const tempId = randomBytes(8).toString('hex')
    const tempDir = path.join(process.cwd(), 'public', 'uploads', 'temp')
    tempVideoPath = path.join(tempDir, `video-${tempId}.mp4`)
    tempCoverPath = path.join(tempDir, `cover-${tempId}.jpg`)

    // 从 R2 下载视频
    const videoBuffer = await downloadVideoFromR2(r2Key)

    // 保存到临时文件
    await writeFile(tempVideoPath, videoBuffer)
    console.log('[EXTRACT COVER] 视频已保存到临时文件:', tempVideoPath)

    // 使用 ffmpeg 截取视频首帧
    // -ss 0: 从第0秒开始
    // -vframes 1: 只截取1帧
    // -q:v 2: 高质量JPEG
    const ffmpegCmd = `"C:\\ffmpeg\\bin\\ffmpeg.exe" -y -ss 0 -i "${tempVideoPath}" -vframes 1 -q:v 2 "${tempCoverPath}"`

    console.log('[EXTRACT COVER] 执行 ffmpeg 命令...')

    try {
      await execAsync(ffmpegCmd, { timeout: 60000 })
    } catch (error: any) {
      console.error('[EXTRACT COVER] FFmpeg 执行失败:', error)
      return NextResponse.json(
        { success: false, error: '截取封面失败: ' + (error.message || '未知错误') },
        { status: 500 }
      )
    }

    // 检查封面文件是否生成成功
    if (!existsSync(tempCoverPath)) {
      return NextResponse.json(
        { success: false, error: '封面文件生成失败' },
        { status: 500 }
      )
    }

    console.log('[EXTRACT COVER] 封面文件已生成')

    // 读取封面文件
    const fs = require('fs')
    const coverBuffer = fs.readFileSync(tempCoverPath!)
    const coverFileName = `cover-${Date.now()}-${tempId}.jpg`

    // 上传到 R2
    console.log('[EXTRACT COVER] 开始上传封面到 R2...')
    const uploadResult = await uploadCoverToR2(coverBuffer, coverFileName)

    if (uploadResult.error || !uploadResult.url) {
      return NextResponse.json(
        { success: false, error: '封面上传失败: ' + uploadResult.error },
        { status: 500 }
      )
    }

    console.log('[EXTRACT COVER] 封面上传成功:', uploadResult.url)

    return NextResponse.json({
      success: true,
      data: { coverUrl: uploadResult.url }
    })
  } catch (error: any) {
    console.error('[EXTRACT COVER] Error:', error)
    return NextResponse.json(
      { success: false, error: '截取封面失败: ' + (error.message || '未知错误') },
      { status: 500 }
    )
  } finally {
    // 清理临时文件
    const fs = require('fs')
    if (tempVideoPath && fs.existsSync(tempVideoPath)) {
      try {
        await unlink(tempVideoPath)
        console.log('[EXTRACT COVER] 临时视频文件已删除')
      } catch (e) {
        console.warn('[EXTRACT COVER] 删除临时视频文件失败:', e)
      }
    }
    if (tempCoverPath && fs.existsSync(tempCoverPath)) {
      try {
        await unlink(tempCoverPath)
        console.log('[EXTRACT COVER] 临时封面文件已删除')
      } catch (e) {
        console.warn('[EXTRACT COVER] 删除临时封面文件失败:', e)
      }
    }
  }
}
