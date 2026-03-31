import { NextRequest, NextResponse } from 'next/server'
import { verifyUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 获取用户收藏的视频
export async function GET(request: NextRequest) {
  try {
    const user = await verifyUser(request)

    if (!user) {
      console.log('[Favorites API] User not authenticated')
      return NextResponse.json(
        { success: false, error: '需要登录' },
        { status: 401 }
      )
    }

    console.log('[Favorites API] User:', user.id, user.username)

    // 获取用户收藏的视频
    const favorites = await prisma.favoriteVideo.findMany({
      where: { userId: user.id },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            description: true,
            coverPath: true,
            duration: true,
            difficulty: true,
            category: true,
            createdAt: true
          }
        }
      }
    })

    console.log('[Favorites API] Found favorites:', favorites.length)
    console.log('[Favorites API] Favorite videoIds:', favorites.map(f => ({ id: f.id, videoId: f.videoId, hasVideo: !!f.video })))

    const videos = favorites.map(f => f.video).filter(Boolean)
    console.log('[Favorites API] Returning videos:', videos.length)

    return NextResponse.json({
      success: true,
      data: { videos }
    })
  } catch (error) {
    console.error('Get favorites error:', error)
    return NextResponse.json(
      { success: false, error: '获取收藏视频失败' },
      { status: 500 }
    )
  }
}
