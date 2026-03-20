import { NextRequest, NextResponse } from 'next/server'
import { verifyUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 获取用户的收藏视频列表
export async function GET(request: NextRequest) {
  try {
    const user = await verifyUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '需要登录' },
        { status: 401 }
      )
    }

    const favorites = await prisma.favoriteVideo.findMany({
      where: { userId: user.id },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            description: true,
            filePath: true,
            coverPath: true,
            duration: true,
            difficulty: true,
            category: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: { favorites }
    })
  } catch (error) {
    console.error('Get favorites error:', error)
    return NextResponse.json(
      { success: false, error: '获取收藏列表失败' },
      { status: 500 }
    )
  }
}

// 添加收藏
export async function POST(request: NextRequest) {
  try {
    const user = await verifyUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '需要登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { videoId } = body

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: '视频ID不能为空' },
        { status: 400 }
      )
    }

    // 检查是否已收藏
    const existing = await prisma.favoriteVideo.findUnique({
      where: {
        userId_videoId: {
          userId: user.id,
          videoId
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: '已经收藏过了' },
        { status: 400 }
      )
    }

    const favorite = await prisma.favoriteVideo.create({
      data: {
        userId: user.id,
        videoId
      }
    })

    return NextResponse.json({
      success: true,
      data: { favorite }
    })
  } catch (error) {
    console.error('Add favorite error:', error)
    return NextResponse.json(
      { success: false, error: '添加收藏失败' },
      { status: 500 }
    )
  }
}

// 取消收藏
export async function DELETE(request: NextRequest) {
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

    await prisma.favoriteVideo.delete({
      where: {
        userId_videoId: {
          userId: user.id,
          videoId
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: '取消收藏成功'
    })
  } catch (error) {
    console.error('Remove favorite error:', error)
    return NextResponse.json(
      { success: false, error: '取消收藏失败' },
      { status: 500 }
    )
  }
}
