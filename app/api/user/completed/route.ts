import { NextRequest, NextResponse } from 'next/server'
import { verifyUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 获取用户已完成的视频
export async function GET(request: NextRequest) {
  try {
    const user = await verifyUser(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: '需要登录' },
        { status: 401 }
      )
    }

    // 获取用户已完成的视频
    const completedProgress = await prisma.userProgress.findMany({
      where: {
        userId: user.id,
        completed: true
      },
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

    const videos = completedProgress.map(p => p.video).filter(Boolean)

    return NextResponse.json({
      success: true,
      data: { videos }
    })
  } catch (error) {
    console.error('Get completed error:', error)
    return NextResponse.json(
      { success: false, error: '获取已完成视频失败' },
      { status: 500 }
    )
  }
}
