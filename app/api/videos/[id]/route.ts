import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 构建文件的公开 URL
function getPublicUrl(filePath: string): string {
  // 如果已经是完整 URL，直接返回
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath
  }

  // 使用代理服务器（因为 R2 没有配置公开访问）
  return `/api/video-proxy/${filePath}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value
    let user = null

    if (token) {
      user = await verifyToken(token)
    }

    const video = await prisma.video.findUnique({
      where: { id: params.id },
      include: {
        subtitles: {
          orderBy: { language: 'asc' }
        }
      }
    })

    if (!video) {
      return NextResponse.json(
        { success: false, error: '视频不存在' },
        { status: 404 }
      )
    }

    // 解析字幕内容
    const subtitles = video.subtitles.map(sub => ({
      ...sub,
      content: JSON.parse(sub.content)
    }))

    // 转换 filePath 为完整的公开 URL
    const videoWithUrl = {
      ...video,
      filePath: getPublicUrl(video.filePath),
      coverPath: video.coverPath ? getPublicUrl(video.coverPath) : null
    }

    return NextResponse.json({
      success: true,
      data: {
        video: {
          ...videoWithUrl,
          subtitles
        }
      }
    })
  } catch (error) {
    console.error('Get video error:', error)
    return NextResponse.json(
      { success: false, error: '获取视频失败' },
      { status: 500 }
    )
  }
}
