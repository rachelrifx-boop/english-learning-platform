import { NextRequest, NextResponse } from 'next/server'
import { verifyUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '需要登录' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const videoId = searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: '视频ID不能为空' },
        { status: 400 }
      )
    }

    const favorite = await prisma.favoriteVideo.findUnique({
      where: {
        userId_videoId: {
          userId: user.id,
          videoId
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: { isFavorited: !!favorite }
    })
  } catch (error) {
    console.error('Check favorite error:', error)
    return NextResponse.json(
      { success: false, error: '检查收藏状态失败' },
      { status: 500 }
    )
  }
}
