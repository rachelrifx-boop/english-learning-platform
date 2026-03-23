import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { exec } from 'child_process'
import { promisify } from 'util'
import { randomBytes } from 'crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const execAsync = promisify(exec)

// R2 配置
const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos'
const r2CustomDomain = process.env.CLOUDFLARE_R2_CUSTOM_DOMAIN

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

// 服务器端直接上传到 R2
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

    // 返回相对路径作为 URL（与视频上传保持一致）
    return { url: key }
  } catch (error: any) {
    console.error('[EXTRACT COVER] R2 上传失败:', error)
    return { url: null, error: error.message }
  }
}

// 从视频URL截取首帧作为封面
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
    const { videoUrl } = body

    if (!videoUrl) {
      return NextResponse.json({ success: false, error: '请提供视频URL' }, { status: 400 })
    }

    console.log('[EXTRACT COVER] 开始截取视频首帧:', videoUrl)

    // 生成临时文件名
    const tempId = randomBytes(8).toString('hex')
    const tempCoverPath = `C:\\Users\\DanDan\\english-learning-platform\\public\\uploads\\temp\\cover-${tempId}.jpg`

    // 获取完整的视频URL（如果是相对路径）
    let fullVideoUrl = videoUrl
    if (videoUrl.startsWith('/api/video-proxy/')) {
      fullVideoUrl = `http://localhost:3000${videoUrl}`
    } else if (videoUrl.startsWith('/')) {
      fullVideoUrl = `http://localhost:3000${videoUrl}`
    } else if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
      // 相对路径（如 videos/xxx.mp4），需要通过 video-proxy 访问
      fullVideoUrl = `http://localhost:3000/api/video-proxy/${videoUrl}`
    }

    console.log('[EXTRACT COVER] 完整视频URL:', fullVideoUrl)

    // 使用 ffmpeg 截取视频首帧
    // -ss 0: 从第0秒开始
    // -vframes 1: 只截取1帧
    const ffmpegCmd = `"C:\\ffmpeg\\bin\\ffmpeg.exe" -y -ss 0 -i "${fullVideoUrl}" -vframes 1 -q:v 2 "${tempCoverPath}"`

    console.log('[EXTRACT COVER] 执行命令:', ffmpegCmd)

    try {
      await execAsync(ffmpegCmd, { timeout: 60000 })
    } catch (error: any) {
      console.error('[EXTRACT COVER] FFmpeg 执行失败:', error)
      return NextResponse.json(
        { success: false, error: '截取封面失败: ' + (error.message || '未知错误') },
        { status: 500 }
      )
    }

    // 检查文件是否生成成功
    const fs = require('fs')
    if (!fs.existsSync(tempCoverPath)) {
      return NextResponse.json(
        { success: false, error: '封面文件生成失败' },
        { status: 500 }
      )
    }

    console.log('[EXTRACT COVER] 封面文件已生成:', tempCoverPath)

    // 读取文件并上传到 R2（服务器端直接上传）
    const coverBuffer = fs.readFileSync(tempCoverPath)
    const coverFileName = `cover-${tempId}.jpg`

    // 删除临时文件
    try {
      fs.unlinkSync(tempCoverPath)
      console.log('[EXTRACT COVER] 临时文件已删除')
    } catch (e) {
      console.warn('[EXTRACT COVER] 删除临时文件失败:', e)
    }

    // 上传到云端存储
    console.log('[EXTRACT COVER] 开始上传封面到云端...')
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
  }
}
