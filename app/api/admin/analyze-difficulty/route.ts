import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeDifficulty } from '@/lib/difficulty-analyzer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { videoId } = body

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: '缺少视频ID' },
        { status: 400 }
      )
    }

    // 获取视频信息
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        subtitles: {
          where: { language: 'EN' }
        }
      }
    })

    if (!video) {
      return NextResponse.json(
        { success: false, error: '视频不存在' },
        { status: 404 }
      )
    }

    // 检查是否有英文字幕
    if (!video.subtitles || video.subtitles.length === 0) {
      return NextResponse.json(
        { success: false, error: '该视频没有英文字幕，无法分析难度' },
        { status: 400 }
      )
    }

    // 解析字幕内容
    const subtitleContent = video.subtitles[0].content
    let subtitles

    try {
      subtitles = typeof subtitleContent === 'string'
        ? JSON.parse(subtitleContent)
        : subtitleContent
    } catch (error) {
      return NextResponse.json(
        { success: false, error: '字幕解析失败' },
        { status: 400 }
      )
    }

    if (!Array.isArray(subtitles) || subtitles.length === 0) {
      return NextResponse.json(
        { success: false, error: '字幕格式不正确' },
        { status: 400 }
      )
    }

    // 分析难度
    const result = analyzeDifficulty(subtitles, video.duration)

    // 更新数据库
    await prisma.video.update({
      where: { id: videoId },
      data: { difficulty: result.level }
    })

    return NextResponse.json({
      success: true,
      data: {
        level: result.level,
        confidence: result.confidence,
        details: result.details,
        previousLevel: video.difficulty
      }
    })
  } catch (error: any) {
    console.error('分析难度失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '分析失败' },
      { status: 500 }
    )
  }
}
