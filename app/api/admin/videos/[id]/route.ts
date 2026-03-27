import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 获取单个视频
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '无权访问' }, { status: 403 })
    }

    const video = await prisma.video.findUnique({
      where: { id: params.id },
      include: {
        subtitles: true
      }
    })

    if (!video) {
      return NextResponse.json({ success: false, error: '视频不存在' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { video }
    })
  } catch (error) {
    console.error('Get video error:', error)
    return NextResponse.json(
      { success: false, error: '获取视频失败' },
      { status: 500 }
    )
  }
}

// 更新视频
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '无权访问' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, difficulty, category, coverPath } = body

    // 检查视频是否存在
    const existingVideo = await prisma.video.findUnique({
      where: { id: params.id }
    })

    if (!existingVideo) {
      return NextResponse.json({ success: false, error: '视频不存在' }, { status: 404 })
    }

    // 构建更新数据对象（只更新提供的字段）
    const updateData: any = {}

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description || null
    if (difficulty !== undefined) updateData.difficulty = difficulty
    if (category !== undefined) updateData.category = category || null
    if (coverPath !== undefined) updateData.coverPath = coverPath || null

    // 更新视频
    const updatedVideo = await prisma.video.update({
      where: { id: params.id },
      data: updateData,
      include: {
        subtitles: true
      }
    })

    return NextResponse.json({
      success: true,
      data: { video: updatedVideo }
    })
  } catch (error) {
    console.error('Update video error:', error)
    return NextResponse.json(
      { success: false, error: '更新视频失败' },
      { status: 500 }
    )
  }
}

// 删除视频
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '无权访问' }, { status: 403 })
    }

    // 检查视频是否存在
    const existingVideo = await prisma.video.findUnique({
      where: { id: params.id }
    })

    if (!existingVideo) {
      return NextResponse.json({ success: false, error: '视频不存在' }, { status: 404 })
    }

    // 删除相关的字幕记录
    await prisma.subtitle.deleteMany({
      where: { videoId: params.id }
    })

    // 删除视频记录
    await prisma.video.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: '删除成功'
    })
  } catch (error) {
    console.error('Delete video error:', error)
    return NextResponse.json(
      { success: false, error: '删除视频失败' },
      { status: 500 }
    )
  }
}
