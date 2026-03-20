import { NextRequest, NextResponse } from 'next/server'
import { verifyUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 获取用户的学习进度
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

    if (videoId) {
      // 获取特定视频的进度
      const progress = await prisma.userProgress.findUnique({
        where: {
          userId_videoId: {
            userId: user.id,
            videoId
          }
        }
      })

      return NextResponse.json({
        success: true,
        data: { progress }
      })
    } else {
      // 获取所有视频的进度
      const allProgress = await prisma.userProgress.findMany({
        where: { userId: user.id },
        include: {
          video: {
            select: {
              id: true,
              title: true,
              duration: true,
              coverPath: true
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        data: { progress: allProgress }
      })
    }
  } catch (error) {
    console.error('Get progress error:', error)
    return NextResponse.json(
      { success: false, error: '获取学习进度失败' },
      { status: 500 }
    )
  }
}

// 更新学习进度
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
    const { videoId, position, watchDuration } = body

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: '视频ID不能为空' },
        { status: 400 }
      )
    }

    // 检查视频是否存在
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    })

    if (!video) {
      return NextResponse.json(
        { success: false, error: '视频不存在' },
        { status: 404 }
      )
    }

    // 查找或创建进度记录
    const existing = await prisma.userProgress.findUnique({
      where: {
        userId_videoId: {
          userId: user.id,
          videoId
        }
      }
    })

    let progress
    const currentPosition = position || 0
    const currentWatchDuration = watchDuration || 0

    // 判断是否完成（观看进度达到90%以上）
    const isCompleted = currentPosition >= video.duration * 0.9

    if (existing) {
      // 更新现有记录
      progress = await prisma.userProgress.update({
        where: {
          userId_videoId: {
            userId: user.id,
            videoId
          }
        },
        data: {
          lastPosition: currentPosition,
          watchDuration: existing.watchDuration + currentWatchDuration,
          completed: isCompleted || existing.completed,
          completedAt: (isCompleted && !existing.completed) ? new Date() : existing.completedAt
        }
      })
    } else {
      // 创建新记录
      progress = await prisma.userProgress.create({
        data: {
          userId: user.id,
          videoId,
          lastPosition: currentPosition,
          watchDuration: currentWatchDuration,
          completed: isCompleted,
          completedAt: isCompleted ? new Date() : null
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: { progress }
    })
  } catch (error) {
    console.error('Update progress error:', error)
    return NextResponse.json(
      { success: false, error: '更新学习进度失败' },
      { status: 500 }
    )
  }
}
