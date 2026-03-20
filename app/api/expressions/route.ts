import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 获取用户表达卡片
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Token 无效' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')

    const where: any = { userId: payload.userId }
    if (videoId) {
      where.videoId = videoId
    }

    const expressions = await prisma.expression.findMany({
      where,
      include: {
        video: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: { expressions }
    })
  } catch (error) {
    console.error('Get expressions error:', error)
    return NextResponse.json(
      { success: false, error: '获取表达卡片失败' },
      { status: 500 }
    )
  }
}

// 添加表达卡片
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Token 无效' }, { status: 401 })
    }

    const body = await request.json()
    const { videoId, text, translation, timestamp } = body

    if (!videoId || !text || !translation || timestamp === undefined) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      )
    }

    const expression = await prisma.expression.create({
      data: {
        userId: payload.userId,
        videoId,
        text,
        translation,
        timestamp
      }
    })

    return NextResponse.json({
      success: true,
      data: { expression }
    })
  } catch (error) {
    console.error('Add expression error:', error)
    return NextResponse.json(
      { success: false, error: '添加表达卡片失败' },
      { status: 500 }
    )
  }
}

// 删除表达卡片
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Token 无效' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const expressionId = searchParams.get('id')

    if (!expressionId) {
      return NextResponse.json(
        { success: false, error: '缺少表达卡片 ID' },
        { status: 400 }
      )
    }

    // 验证所有权
    const expression = await prisma.expression.findUnique({
      where: { id: expressionId }
    })

    if (!expression || expression.userId !== payload.userId) {
      return NextResponse.json(
        { success: false, error: '无权删除该表达卡片' },
        { status: 403 }
      )
    }

    await prisma.expression.delete({
      where: { id: expressionId }
    })

    return NextResponse.json({
      success: true,
      message: '删除成功'
    })
  } catch (error) {
    console.error('Delete expression error:', error)
    return NextResponse.json(
      { success: false, error: '删除表达卡片失败' },
      { status: 500 }
    )
  }
}
