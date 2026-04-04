import { NextRequest } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { createReadStream, existsSync, statSync } from 'fs'
import { join } from 'path'

// 复用 S3Client 实例 - 避免每次请求都创建新连接
let r2Client: S3Client | null = null

// 初始化 R2 客户端（单例模式）
function getR2Client() {
  const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY

  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
    throw new Error('R2 配置不完整')
  }

  // 如果已存在客户端，直接返回
  if (r2Client) {
    return r2Client
  }

  // 创建新的客户端
  const endpoint = `https://${r2AccountId}.r2.cloudflarestorage.com`

  r2Client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  })

  console.log('[Video Proxy] S3Client initialized')
  return r2Client
}

// 从 R2 或本地代理视频 - 支持流式传输和范围请求
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/')
    console.log('[Video Proxy] Requesting:', path)

    // 检查是否是本地文件（uploads/ 目录）
    if (path.startsWith('uploads/')) {
      return serveLocalFile(path, request)
    }

    // 否则从 R2 获取
    return serveR2File(path, request)
  } catch (error: any) {
    console.error('[Video Proxy] Error:', error)
    return new Response(JSON.stringify({
      error: '视频加载失败',
      message: error.message
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// 服务本地文件
async function serveLocalFile(relativePath: string, request: NextRequest) {
  const fullPath = join(process.cwd(), 'public', relativePath)

  if (!existsSync(fullPath)) {
    console.error('[Video Proxy] Local file not found:', fullPath)
    return new Response(JSON.stringify({ error: '视频文件不存在' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  console.log('[Video Proxy] Serving local file:', fullPath)

  const stats = statSync(fullPath)
  const fileSize = stats.size
  const rangeHeader = request.headers.get('range')

  let start = 0
  let end = fileSize - 1

  if (rangeHeader) {
    const matches = /bytes=(\d+)-(\d*)/.exec(rangeHeader)
    if (matches) {
      start = parseInt(matches[1], 10)
      if (matches[2]) {
        end = parseInt(matches[2], 10)
      }
      console.log('[Video Proxy] Range request:', { start, end })
    }
  }

  const contentLength = end - start + 1
  const status = start > 0 || end < fileSize - 1 ? 206 : 200

  const headers: Record<string, string> = {
    'Content-Type': getContentType(relativePath),
    'Content-Length': contentLength.toString(),
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': '*',
  }

  if (status === 206) {
    headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`
  }

  // 使用较大的缓冲区
  const stream = createReadStream(fullPath, {
    start,
    end,
    highWaterMark: 256 * 1024 // 256KB 缓冲区
  })

  return new Response(stream as any, {
    status,
    headers,
  })
}

// 从 R2 获取文件
async function serveR2File(path: string, request: NextRequest) {
  const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos'

  let client: S3Client
  try {
    client = getR2Client()
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 解析 Range 请求头
  const rangeHeader = request.headers.get('range')
  let range: { start: number; end?: number } | undefined

  if (rangeHeader) {
    const matches = /bytes=(\d+)-(\d*)/.exec(rangeHeader)
    if (matches) {
      range = {
        start: parseInt(matches[1], 10),
        end: matches[2] ? parseInt(matches[2], 10) : undefined
      }
    }
  }

  console.log('[Video Proxy] Fetching from R2:', path, range ? `Range: ${range.start}-${range.end ?? ''}` : 'Full file')

  try {
    const command = new GetObjectCommand({
      Bucket: r2BucketName,
      Key: path,
      Range: range ? `bytes=${range.start}-${range.end ?? ''}` : undefined,
    })

    const response = await client.send(command)
    const body = response.Body

    if (!body) {
      return new Response(JSON.stringify({ error: '视频文件不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log('[Video Proxy] R2 response received, ContentLength:', response.ContentLength)

    // 转换为 Web Stream
    const webStream = body.transformToWebStream()

    // 获取内容长度
    const contentLength = response.ContentLength
    const contentRange = response.ContentRange

    // 如果是范围请求，返回 206 状态码
    const status = contentRange ? 206 : 200

    const headers: Record<string, string> = {
      'Content-Type': response.ContentType || getContentType(path),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*',
    }

    if (contentLength !== undefined) {
      headers['Content-Length'] = contentLength.toString()
    }

    if (contentRange) {
      headers['Content-Range'] = contentRange
    }

    console.log('[Video Proxy] Streaming response, status:', status)

    // 返回流式响应
    return new Response(webStream, {
      status,
      headers,
    })
  } catch (error: any) {
    console.error('[Video Proxy] R2 fetch error:', error)
    throw error
  }
}

// 获取文件内容类型
function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'mp4':
      return 'video/mp4'
    case 'webm':
      return 'video/webm'
    case 'ogg':
      return 'video/ogg'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

// 添加 OPTIONS 处理，支持 CORS 预检
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Max-Age': '86400',
    },
  })
}

// 添加 HEAD 处理，支持快速获取文件信息
export async function HEAD(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path.join('/')

    // 本地文件
    if (path.startsWith('uploads/')) {
      const fullPath = join(process.cwd(), 'public', path)
      if (!existsSync(fullPath)) {
        return new Response(null, { status: 404 })
      }
      const stats = statSync(fullPath)
      return new Response(null, {
        status: 200,
        headers: {
          'Content-Type': getContentType(path),
          'Content-Length': stats.size.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // R2 文件
    const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos'
    const client = getR2Client()

    const command = new GetObjectCommand({
      Bucket: r2BucketName,
      Key: path,
    })

    const response = await client.send(command)

    return new Response(null, {
      status: 200,
      headers: {
        'Content-Type': response.ContentType || getContentType(path),
        'Content-Length': response.ContentLength?.toString() || '0',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error: any) {
    return new Response(null, { status: 404 })
  }
}
