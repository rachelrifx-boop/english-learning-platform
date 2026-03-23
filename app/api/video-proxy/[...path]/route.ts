import { NextRequest } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

// 从 R2 代理视频 - 支持流式传输和范围请求
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/')
    console.log('[Video Proxy] Requesting:', path)

    const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
    const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
    const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
    const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos'

    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
      return new Response(JSON.stringify({ error: 'R2 配置不完整' }), {
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
        console.log('[Video Proxy] Range request:', range)
      }
    }

    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    })

    const command = new GetObjectCommand({
      Bucket: r2BucketName,
      Key: path,
      Range: range ? `bytes=${range.start}-${range.end ?? ''}` : undefined,
    })

    const response = await r2Client.send(command)
    const body = response.Body

    if (!body) {
      return new Response(JSON.stringify({ error: '视频文件不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 转换为 Web Stream
    const webStream = body.transformToWebStream()

    // 获取内容长度
    const contentLength = response.ContentLength
    const contentRange = response.ContentRange

    // 如果是范围请求，返回 206 状态码
    const status = contentRange ? 206 : 200

    const headers: Record<string, string> = {
      'Content-Type': response.ContentType || 'video/mp4',
      'Cache-Control': 'public, max-age=31536000',
      'Accept-Ranges': 'bytes',
    }

    if (contentLength !== undefined) {
      headers['Content-Length'] = contentLength.toString()
    }

    if (contentRange) {
      headers['Content-Range'] = contentRange
    }

    // 返回流式响应
    return new Response(webStream, {
      status,
      headers,
    })
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
