import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { exec } from 'child_process'
import { promisify } from 'util'
import { randomBytes } from 'crypto'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const execAsync = promisify(exec)

// R2 配置
const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos'
const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL // R2 公共访问 URL（如果配置了）

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

// 生成 R2 对象的访问 URL（优先使用公共 URL，否则使用签名 URL）
async function getR2ObjectUrl(key: string): Promise<string> {
  // 如果配置了公共访问 URL，直接返回公共 URL
  if (r2PublicUrl) {
    return `${r2PublicUrl}/${key}`
  }

  // 否则生成临时签名 URL（有效期 5 分钟）
  if (!r2Client) {
    throw new Error('R2 未配置')
  }

  const command = new GetObjectCommand({
    Bucket: r2BucketName,
    Key: key,
  })

  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 })
  return signedUrl
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

// 从视频截取第10秒的帧作为封面（优化版：直接从 HTTP URL 截取，避免黑屏/淡入问题）
export async function POST(request: NextRequest) {
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

    console.log('[EXTRACT COVER] 开始截取视频第10秒帧作为封面:', videoUrl)

    // 处理 videoUrl，获取视频的访问地址
    // 本地文件：uploads/videos/xxx.mp4 -> 通过本地 URL 访问
    // R2 文件：videos/xxx.mp4 -> 通过 R2 URL 访问
    let videoHttpUrl: string
    if (videoUrl.startsWith('uploads/')) {
      // 本地文件，使用服务器本地路径
      const localPath = path.join(process.cwd(), 'public', videoUrl)
      if (existsSync(localPath)) {
        videoHttpUrl = localPath
        console.log('[EXTRACT COVER] 使用本地视频文件:', localPath)
      } else {
        // 如果本地不存在，尝试通过代理访问
        videoHttpUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${videoUrl}`
        console.log('[EXTRACT COVER] 使用本地代理 URL:', videoHttpUrl)
      }
    } else {
      // R2 文件，生成 R2 访问 URL
      let r2Key = videoUrl
      if (videoUrl.startsWith('covers/') || videoUrl.startsWith('videos/')) {
        r2Key = videoUrl
      } else {
        r2Key = `videos/${videoUrl}`
      }
      videoHttpUrl = await getR2ObjectUrl(r2Key)
      console.log('[EXTRACT COVER] 使用 R2 视频 URL')
    }

    // 生成临时封面文件路径
    const tempId = randomBytes(8).toString('hex')
    const tempDir = path.join(process.cwd(), 'public', 'uploads', 'temp')
    tempCoverPath = path.join(tempDir, `cover-${tempId}.jpg`)

    // 使用 ffmpeg 直接从 HTTP URL 截取视频第10秒的帧（避免黑屏/空白帧）
    // -ss 10: 从第10秒开始（避免视频开头的黑屏/淡入效果）
    // -vframes 1: 只截取1帧
    // -q:v 2: 高质量JPEG
    // -threads 1: 单线程处理（避免占用过多资源）
    // 注意：-ss 参数放在 -i 之前可以快速定位，不解码前面的内容
    // 修复：路径中的反斜杠需要转义，或者使用正斜杠（ffmpeg 也支持）
    const inputPath = videoHttpUrl.replace(/\\/g, '/')
    const outputPath = tempCoverPath.replace(/\\/g, '/')
    const ffmpegCmd = `"C:/ffmpeg/bin/ffmpeg.exe" -y -ss 10 -i "${inputPath}" -vframes 1 -q:v 2 "${outputPath}"`

    console.log('[EXTRACT COVER] 执行 ffmpeg 命令（流式截取）...')
    const startTime = Date.now()

    try {
      await execAsync(ffmpegCmd, { timeout: 120000 }) // 2分钟超时
    } catch (error: any) {
      console.error('[EXTRACT COVER] FFmpeg 执行失败:', error)
      return NextResponse.json(
        { success: false, error: '截取封面失败: ' + (error.message || '未知错误') },
        { status: 500 }
      )
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[EXTRACT COVER] ffmpeg 执行完成 (耗时 ${elapsed}秒)`)

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

    console.log(`[EXTRACT COVER] 封面大小: ${(coverBuffer.length / 1024).toFixed(2)}KB`)

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
    // 清理临时封面文件
    const fs = require('fs')
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
