import { NextRequest, NextResponse } from 'next/server'

// R2 配置
const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos'

// 检查是否配置了 R2
const hasR2Config = !!(r2AccountId && r2AccessKeyId && r2SecretAccessKey)

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

    // 检查文件大小（Vercel 免费版限制 4.5MB）
    const MAX_FILE_SIZE = 4.5 * 1024 * 1024 // 4.5MB
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

// 直接上传到 R2（小文件）
async function uploadToR2Direct(file: File, folder: string) {
  try {
    // 动态导入 AWS SDK
    const { S3Client } = await import('@aws-sdk/client-s3')
    const { PutObjectCommand } = await import('@aws-sdk/client-s3')

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
    const fileExtension = file.name.includes('.')
      ? file.name.substring(file.name.lastIndexOf('.'))
      : ''
    const fileName = `${timestamp}-${random}${fileExtension}`
    const key = `${folder}/${fileName}`

    console.log('[R2 UPLOAD] 上传到 R2:', key)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos',
      Key: key,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    })

    await r2Client.send(command)

    console.log('[R2 UPLOAD] 上传成功:', key)

    return NextResponse.json({
      success: true,
      data: {
        path: key,
        url: key,
        storage: 'r2'
      }
    })
  } catch (error: any) {
    console.error('[R2 UPLOAD] 失败:', error)
    throw error
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
