import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const user = await verifyAdmin(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')

    const notifications = await prisma.notification.findMany({
      take: limit,
      include: {
        user: {
          select: {
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: { notifications }
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json(
      { success: false, error: '获取通知列表失败' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const adminUser = await verifyAdmin(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, content, type, targetUser } = body

    if (!title || !title.trim() || !content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: '标题和内容不能为空' },
        { status: 400 }
      )
    }

    // 确定接收通知的用户
    let userIds: string[] = []
    if (targetUser === 'all') {
      // 发送给所有用户
      const allUsers = await prisma.user.findMany({
        select: { id: true }
      })
      userIds = allUsers.map(u => u.id)
    } else {
      // 发送给特定用户
      userIds = [targetUser]
    }

    // 批量创建通知
    const notifications = await prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        title: title.trim(),
        content: content.trim(),
        type: type || 'info'
      }))
    })

    return NextResponse.json({
      success: true,
      data: {
        sentCount: notifications.count,
        message: `成功发送给 ${notifications.count} 位用户`
      }
    })
  } catch (error) {
    console.error('Send notification error:', error)
    return NextResponse.json(
      { success: false, error: '发送通知失败' },
      { status: 500 }
    )
  }
}
