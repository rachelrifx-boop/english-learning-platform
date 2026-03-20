import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 获取笔记列表
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

    const notes = await prisma.note.findMany({
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
      data: { notes }
    })
  } catch (error) {
    console.error('Get notes error:', error)
    return NextResponse.json(
      { success: false, error: '获取笔记失败' },
      { status: 500 }
    )
  }
}

// 添加笔记
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
    const { videoId, text, timestamp, subtitleText } = body

    if (!videoId || !text || timestamp === undefined) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      )
    }

    const note = await prisma.note.create({
      data: {
        userId: payload.userId,
        videoId,
        text,
        timestamp,
        subtitleText
      }
    })

    return NextResponse.json({
      success: true,
      data: { note }
    })
  } catch (error) {
    console.error('Add note error:', error)
    return NextResponse.json(
      { success: false, error: '添加笔记失败' },
      { status: 500 }
    )
  }
}

// 删除笔记
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
    const noteId = searchParams.get('id')

    if (!noteId) {
      return NextResponse.json(
        { success: false, error: '缺少笔记 ID' },
        { status: 400 }
      )
    }

    // 验证所有权
    const note = await prisma.note.findUnique({
      where: { id: noteId }
    })

    if (!note || note.userId !== payload.userId) {
      return NextResponse.json(
        { success: false, error: '无权删除该笔记' },
        { status: 403 }
      )
    }

    await prisma.note.delete({
      where: { id: noteId }
    })

    return NextResponse.json({
      success: true,
      message: '删除成功'
    })
  } catch (error) {
    console.error('Delete note error:', error)
    return NextResponse.json(
      { success: false, error: '删除笔记失败' },
      { status: 500 }
    )
  }
}
