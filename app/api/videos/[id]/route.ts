import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    return NextResponse.json({
      success: true,
      data: {
        video: {
          ...video,
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
