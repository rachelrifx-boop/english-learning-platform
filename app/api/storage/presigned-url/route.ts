import { NextRequest, NextResponse } from 'next/server'

// R2 配置
const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos'

export async function POST(request: NextRequest) {
  try {
    // 检查环境变量
    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
      console.error('[PRESIGNED URL] R2 配置缺失', {
        hasAccountId: !!r2AccountId,
        hasAccessKeyId: !!r2AccessKeyId,
        hasSecretAccessKey: !!r2SecretAccessKey,
        hasBucketName: !!r2BucketName
      })
      return NextResponse.json(
        { success: false, error: 'R2 存储配置缺失，请联系管理员' },
        { status: 500 }
      )
    }

    const body = await request.json()
    console.log('[PRESIGNED URL] 请求体:', { ...body, fileName: body.fileName?.substring(0, 50) })

    const { fileName, fileType, folder = 'videos' } = body

    if (!fileName || !fileType) {
      return NextResponse.json(
        { success: false, error: '缺少文件名或文件类型' },
        { status: 400 }
      )
    }

    // 生成唯一文件名
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    const fileExtension = fileName.includes('.')
      ? fileName.substring(fileName.lastIndexOf('.'))
      : ''
    const uniqueFileName = `${timestamp}-${random}${fileExtension}`
    const key = `${folder}/${uniqueFileName}`

    console.log('[PRESIGNED URL] 生成预签名 URL:', key)

    // 动态导入 AWS SDK 以避免 Vercel Edge 打包问题
    const { S3Client } = await import('@aws-sdk/client-s3')
    const { PutObjectCommand } = await import('@aws-sdk/client-s3')
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')

    // 创建 R2 客户端（禁用校验和以兼容 Cloudflare R2）
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
      // 禁用 MD5 校验和，使用 CRC32
      disableMultiregionAccessPoints: true,
    })

    // 生成 presigned URL（有效期 1 小时）
    const command = new PutObjectCommand({
      Bucket: r2BucketName,
      Key: key,
      ContentType: fileType,
      // 禁用校验和计算，R2 不支持 AWS 的校验和算法
      ChecksumAlgorithm: undefined,
    })

    const signedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600, // 1 小时
      signableOptions: {
        // 不添加校验和头部
      },
    })

    console.log('[PRESIGNED URL] 生成成功, URL长度:', signedUrl.length)

    return NextResponse.json({
      success: true,
      data: {
        signedUrl,
        key,
        url: key // 返回相对路径，用于数据库存储
      }
    })
  } catch (error) {
    console.error('[PRESIGNED URL] Error:', error)
    console.error('[PRESIGNED URL] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '生成预签名 URL 失败'
      },
      { status: 500 }
    )
  }
}
