import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseSubtitle, mergeSubtitles } from '@/lib/subtitle-parser'
import { analyzeDifficulty } from '@/lib/difficulty-analyzer'

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '无权访问' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      videoUrl,
      coverUrl,
      englishSubtitleUrl,
      chineseSubtitleUrl,
      duration,
      difficulty,
      category
    } = body

    // 验证必填字段
    if (!title || !videoUrl) {
      return NextResponse.json(
        { success: false, error: '请填写标题和视频URL' },
        { status: 400 }
      )
    }

    console.log('[UPLOAD] 开始创建视频记录:', title)

    // 解析时长
    const parsedDuration = duration ? parseInt(duration) : 300

    // 创建视频记录
    let videoRecord
    try {
      videoRecord = await prisma.video.create({
        data: {
          title,
          description,
          filePath: videoUrl, // Supabase Storage URL
          coverPath: coverUrl || null,
          duration: parsedDuration,
          difficulty: (difficulty || 'B1') as any,
          category
        }
      })
      console.log('[UPLOAD] 视频记录已创建:', videoRecord.id)
    } catch (error) {
      console.error('[UPLOAD] 创建视频记录失败:', error)
      return NextResponse.json(
        { success: false, error: '创建视频记录失败' },
        { status: 500 }
      )
    }

    // 处理字幕URL
    if (englishSubtitleUrl || chineseSubtitleUrl) {
      let englishSegments: any[] = []
      let chineseSegments: any[] = []

      // 下载并解析英文字幕
      if (englishSubtitleUrl) {
        try {
          console.log('[UPLOAD] 下载英文字幕...')
          const response = await fetch(englishSubtitleUrl)
          const content = await response.text()
          englishSegments = parseSubtitle(content, 'english.srt')

          await prisma.subtitle.create({
            data: {
              videoId: videoRecord.id,
              language: 'EN',
              content: JSON.stringify(englishSegments),
              filePath: englishSubtitleUrl
            }
          })
          console.log('[UPLOAD] 英文字幕已保存')
        } catch (error) {
          console.error('[UPLOAD] 处理英文字幕失败:', error)
        }
      }

      // 下载并解析中文字幕
      if (chineseSubtitleUrl) {
        try {
          console.log('[UPLOAD] 下载中文字幕...')
          const response = await fetch(chineseSubtitleUrl)
          const content = await response.text()
          chineseSegments = parseSubtitle(content, 'chinese.srt')

          await prisma.subtitle.create({
            data: {
              videoId: videoRecord.id,
              language: 'ZH',
              content: JSON.stringify(chineseSegments),
              filePath: chineseSubtitleUrl
            }
          })
          console.log('[UPLOAD] 中文字幕已保存')
        } catch (error) {
          console.error('[UPLOAD] 处理中文字幕失败:', error)
        }
      }

      // 如果两种字幕都有，创建合并版本
      if (englishSegments.length > 0 && chineseSegments.length > 0) {
        const merged = mergeSubtitles(englishSegments, chineseSegments)
        await prisma.subtitle.updateMany({
          where: { videoId: videoRecord.id, language: 'EN' },
          data: { content: JSON.stringify(merged) }
        })
        console.log('[UPLOAD] 字幕已合并')
      }

      // 自动分析难度级别（如果有英文字幕）
      if (englishSegments.length > 0) {
        try {
          console.log('[UPLOAD] 开始自动分析视频难度...')
          const difficultyResult = analyzeDifficulty(englishSegments, parsedDuration)

          console.log(`[UPLOAD] 难度分析结果: ${difficultyResult.level}`)
          console.log(`[UPLOAD] 置信度: ${difficultyResult.confidence}`)

          await prisma.video.update({
            where: { id: videoRecord.id },
            data: { difficulty: difficultyResult.level }
          })

          videoRecord = { ...videoRecord, difficulty: difficultyResult.level }
          console.log(`[UPLOAD] ✓ 已自动设置难度为: ${difficultyResult.level}`)
        } catch (error) {
          console.error('[UPLOAD] 自动难度分析失败:', error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { video: videoRecord }
    })
  } catch (error) {
    console.error('[UPLOAD] Error:', error)
    return NextResponse.json(
      { success: false, error: '创建视频失败，请稍后重试' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '无权访问' }, { status: 403 })
    }

    const videos = await prisma.video.findMany({
      include: {
        subtitles: true,
        _count: {
          select: { words: true, expressions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: { videos }
    })
  } catch (error) {
    console.error('Get videos error:', error)
    return NextResponse.json(
      { success: false, error: '获取视频列表失败' },
      { status: 500 }
    )
  }
}
