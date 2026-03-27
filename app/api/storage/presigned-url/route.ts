import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createHash } from 'crypto'

// R2 配置
const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos'

/**
 * AWS S3 兼容的 URI 编码
 */
function uriEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/%2F/g, '/')
    .replace(/%3A/g, ':')
    .replace(/%2B/g, '+')
    .replace(/%3D/g, '=')
    .replace(/%26/g, '&')
}

/**
 * 手动生成 R2 预签名 URL（不含校验和头部）
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
  // 使用 bucket 子域名格式
  const endpoint = `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`

  // 时间
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:\-]|\.\d+/g, '')
  const dateStamp = amzDate.substring(0, 8)

  // 签名参数
  const algorithm = 'AWS4-HMAC-SHA256'
  const service = 's3'
  const region = 'auto'
  const signedHeaders = 'host' // 只签名 host 头部，不包含 content-type

  // URL 编码的 key
  const encodedKey = uriEncode(key)

  // 构建查询参数
  const params: Record<string, string> = {
    'X-Amz-Algorithm': algorithm,
    'X-Amz-Credential': `${accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': signedHeaders
  }

  // 构建规范查询字符串
  const canonicalQueryString = Object.keys(params)
    .sort()
    .map(k => `${uriEncode(k)}=${uriEncode(params[k])}`)
    .join('&')

  // 规范 URI
  const canonicalUri = `/${encodedKey}`

  // 规范 Headers - 只包含 host
  const host = `${bucketName}.${accountId}.r2.cloudflarestorage.com`
  const canonicalHeaders = `host:${host}\n`
  const payloadHash = 'UNSIGNED-PAYLOAD'

  // 规范请求
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n')

  // 计算规范请求哈希
  const canonicalRequestHash = createHash('sha256').update(canonicalRequest).digest('hex')

  // 待签名字符串
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join('\n')

  // 计算签名密钥
  const kDate = createHmac('sha256', `AWS4${secretAccessKey}`).update(dateStamp).digest()
  const kRegion = createHmac('sha256', kDate).update(region).digest()
  const kService = createHmac('sha256', kRegion).update(service).digest()
  const kSigning = createHmac('sha256', kService).update('aws4_request').digest()

  // 计算签名
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex')

  // 构建最终 URL
  return `${endpoint}/${encodedKey}?${canonicalQueryString}&X-Amz-Signature=${signature}`
}

export async function POST(request: NextRequest) {
  try {
    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
      return NextResponse.json(
        { success: false, error: 'R2 存储配置缺失，请联系管理员' },
        { status: 500 }
      )
    }

    const body = await request.json()
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

    // 手动生成预签名 URL（不包含校验和头部）
    const signedUrl = generatePresignedUrl(
      r2AccountId,
      r2AccessKeyId,
      r2SecretAccessKey,
      r2BucketName,
      key,
      fileType
    )

    return NextResponse.json({
      success: true,
      data: {
        signedUrl,
        key,
        url: key,
        contentType: fileType
      }
    })
  } catch (error) {
    console.error('[PRESIGNED URL] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '生成预签名 URL 失败'
      },
      { status: 500 }
    )
  }
}
