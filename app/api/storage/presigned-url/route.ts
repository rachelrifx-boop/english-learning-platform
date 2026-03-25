import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

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

    // 手动生成预签名 URL（完全控制，避免 AWS SDK 添加不需要的参数）
    const signedUrl = generatePresignedUrl(r2AccountId, r2AccessKeyId, r2SecretAccessKey, r2BucketName, key, fileType)

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

/**
 * 手动生成 R2 预签名 URL（AWS S3 兼容）
 * 完全控制签名过程，避免 AWS SDK 添加校验和等不需要的参数
 */
function generatePresignedUrl(
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucketName: string,
  key: string,
  contentType: string,
  expiresIn: number = 3600
): string {
  const expiration = Math.floor(Date.now() / 1000) + expiresIn
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`

  // 构建 URL
  const url = new URL(`${endpoint}/${bucketName}/${key}`)

  // AWS S3 签名参数（V4 签名）
  const algorithm = 'AWS4-HMAC-SHA256'
  const service = 's3'
  const region = 'auto'
  const date = new Date()
  const dateStamp = date.toISOString().split('T')[0].replace(/-/g, '')
  const timeString = date.toISOString().replace(/[:\-]|\.\d+/g, '')

  // 查询参数
  url.searchParams.set('X-Amz-Algorithm', algorithm)
  url.searchParams.set('X-Amz-Credential', `${accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`)
  url.searchParams.set('X-Amz-Date', timeString)
  url.searchParams.set('X-Amz-Expires', expiresIn.toString())
  url.searchParams.set('X-Amz-SignedHeaders', 'content-type;host')

  // 构建待签名字符串
  const method = 'PUT'
  const canonicalUri = `/${bucketName}/${key}`
  const canonicalQueryString = url.searchParams.toString()
  const canonicalHeaders = `content-type:${contentType}\nhost:${url.host}\n`
  const signedHeaders = 'content-type;host'
  const payloadHash = 'UNSIGNED-PAYLOAD'

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n')

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = [
    algorithm,
    timeString,
    credentialScope,
    createHmac('sha256', canonicalRequest).digest('hex')
  ].join('\n')

  // 计算签名
  const kDate = createHmac('sha256', `AWS4${secretAccessKey}`).update(dateStamp).digest()
  const kRegion = createHmac('sha256', kDate).update(region).digest()
  const kService = createHmac('sha256', kRegion).update(service).digest()
  const kSigning = createHmac('sha256', kService).update('aws4_request').digest()
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex')

  url.searchParams.set('X-Amz-Signature', signature)

  return url.toString()
}
