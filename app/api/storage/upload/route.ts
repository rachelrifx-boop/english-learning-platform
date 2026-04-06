import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

// R2 配置
const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos'

// 检查是否配置了 R2
const hasR2Config = !!(r2AccountId && r2AccessKeyId && r2SecretAccessKey)

// 获取视频时长（使用本地临时文件）
async function getVideoDurationFromBuffer(buffer: Buffer): Promise<number | null> {
  const tempDir = path.join(process.cwd(), 'public', 'uploads', 'temp')
  const tempFile = path.join(tempDir, `duration-${Date.now()}.mp4`)

  try {
    // 确保目录存在
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true })
    }

    // 写入临时文件
    await writeFile(tempFile, buffer)
    console.log('[STORAGE UPLOAD] 临时文件已创建，获取时长中...')

    // 使用 ffprobe 获取时长
    const command = `"C:\\ffmpeg\\bin\\ffprobe.exe" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempFile}"`
    const { stdout } = await execAsync(command, { timeout: 30000 })

    const duration = parseFloat(stdout.trim())
    console.log('[STORAGE UPLOAD] 视频时长:', duration, '秒')

    if (isNaN(duration)) {
      console.warn('[STORAGE UPLOAD] 无法解析时长，使用默认值')
      return null
    }

    return Math.round(duration)
  } catch (error) {
    console.warn('[STORAGE UPLOAD] 获取视频时长失败:', error)
    return null
  } finally {
    // 删除临时文件
    if (existsSync(tempFile)) {
      try {
        await unlink(tempFile)
      } catch (e) {
        // 忽略删除错误
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string || 'videos'
    const folder = formData.get('folder') as string || 'videos'

    if (!file) {
      return NextResponse.json(
        { success: false, error: '没有找到文件' },
        { status: 400 }
      )
    }

    console.log('[STORAGE UPLOAD] 开始上传:', {
      fileName: file.name,
      fileSize: file.size,
      fileSizeMB: (file.size / 1024 / 1024).toFixed(2),
      bucket,
      folder,
      hasR2Config
    })

    // 检查是否是 Vercel 环境
    const isVercel = process.env.VERCEL === '1'

    // 检查文件大小（Vercel 免费版限制 4.5MB）
    // 本地开发环境不限制，直接服务器端上传
    const MAX_FILE_SIZE = 4.5 * 1024 * 1024 // 4.5MB

    if (!isVercel && hasR2Config) {
      // 本地开发环境：所有文件都通过服务器端直接上传（避免 CORS 问题）
      console.log('[STORAGE UPLOAD] 本地开发环境，使用服务器端直接上传')
      return await uploadToR2Direct(file, folder)
    }

    if (file.size > MAX_FILE_SIZE) {
      console.log('[STORAGE UPLOAD] 文件过大，返回预签名 URL 用于客户端直接上传')
      // 返回预签名 URL，让客户端直接上传
      return await getPresignedUrl(file.name, file.type, folder)
    }

    // 小文件使用服务器端上传
    if (hasR2Config) {
      return await uploadToR2Direct(file, folder)
    }

    return NextResponse.json(
      { success: false, error: '未配置存储服务' },
      { status: 500 }
    )
  } catch (error) {
    console.error('[STORAGE UPLOAD] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '上传失败'
      },
      { status: 500 }
    )
  }
}

// 带重试的上传函数
async function uploadWithRetry(client: any, command: any, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[R2 UPLOAD] 上传尝试 ${attempt}/${maxRetries}...`)
      const result = await client.send(command)
      console.log(`[R2 UPLOAD] 上传成功！`)
      return result
    } catch (error: any) {
      console.error(`[R2 UPLOAD] 尝试 ${attempt} 失败:`, error.message)

      // 检查是否是 SSL/网络错误，这些错误值得重试
      const isRetryableError =
        error.message?.includes('SSL') ||
        error.message?.includes('timeout') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('socket hang up') ||
        error.code === 'EPIPE' ||
        error.$metadata?.httpStatusCode === 503 ||
        error.$metadata?.httpStatusCode === 504

      if (!isRetryableError || attempt === maxRetries) {
        throw error
      }

      // 指数退避
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
      console.log(`[R2 UPLOAD] 等待 ${delay}ms 后重试...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('上传失败：超过最大重试次数')
}

// 直接上传到 R2（支持大文件）
async function uploadToR2Direct(file: File, folder: string) {
  const { S3Client } = await import('@aws-sdk/client-s3')
  const { PutObjectCommand } = await import('@aws-sdk/client-s3')

  // 大文件阈值 (100MB)
  const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024
  const isLargeFile = file.size > LARGE_FILE_THRESHOLD

  // 创建 S3Client，增加超时时间
  const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
    // 增加超时设置
    requestHandler: {
      requestTimeout: isLargeFile ? 600000 : 300000, // 大文件 10 分钟，小文件 5 分钟
      httpsAgent: undefined,
    },
    maxAttempts: 1, // 禁用内置重试，使用我们自己的重试逻辑
  })

  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  const fileExtension = file.name.includes('.')
    ? file.name.substring(file.name.lastIndexOf('.'))
    : ''
  const fileName = `${timestamp}-${random}${fileExtension}`
  const key = `${folder}/${fileName}`

  console.log('[R2 UPLOAD] 上传到 R2:', key, `文件大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`)

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // 在上传前获取视频时长（仅限视频文件）
  let duration = null
  if (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.mov') || file.name.endsWith('.avi') || file.name.endsWith('.mkv')) {
    console.log('[R2 UPLOAD] 检测到视频文件，获取时长...')
    duration = await getVideoDurationFromBuffer(buffer)
    if (duration) {
      console.log('[R2 UPLOAD] 视频时长:', duration, '秒')
    }
  }

  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos',
    Key: key,
    Body: buffer,
    ContentType: file.type || 'application/octet-stream',
  })

  try {
    await uploadWithRetry(r2Client, command, 3)

    console.log('[R2 UPLOAD] 上传成功:', key)

    return NextResponse.json({
      success: true,
      data: {
        path: key,
        url: key,
        storage: 'r2',
        duration // 返回时长信息
      }
    })
  } catch (error: any) {
    console.error('[R2 UPLOAD] 上传失败:', error.message)

    // 直接返回错误，不再降级到本地
    // 避免生产环境出现无法访问的本地文件
    return NextResponse.json(
      {
        success: false,
        error: '上传到云存储失败，请检查网络连接后重试',
        details: error.message,
        code: error.name || 'UPLOAD_FAILED'
      },
      { status: 503 }
    )
  }
}

// 获取预签名 URL（大文件，客户端直接上传）
async function getPresignedUrl(fileName: string, fileType: string, folder: string) {
  try {
    const { S3Client } = await import('@aws-sdk/client-s3')
    const { PutObjectCommand } = await import('@aws-sdk/client-s3')
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')

    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    })

    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    const fileExtension = fileName.includes('.')
      ? fileName.substring(fileName.lastIndexOf('.'))
      : ''
    const uniqueFileName = `${timestamp}-${random}${fileExtension}`
    const key = `${folder}/${uniqueFileName}`

    console.log('[PRESIGNED URL] 生成预签名 URL:', key)

    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos',
      Key: key,
      ContentType: fileType,
    })

    const signedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600,
    })

    console.log('[PRESIGNED URL] 生成成功')

    return NextResponse.json({
      success: true,
      data: {
        presignedUrl: signedUrl,
        key,
        url: key,
        storage: 'r2-presigned',
        useDirectUpload: true // 标记需要客户端直接上传
      }
    })
  } catch (error: any) {
    console.error('[PRESIGNED URL] 失败:', error)
    throw error
  }
}
