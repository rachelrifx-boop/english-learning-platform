import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseSubtitle, mergeSubtitles } from '@/lib/subtitle-parser'
import { analyzeDifficulty } from '@/lib/difficulty-analyzer'
import { uploadFile } from '@/lib/supabase'

// 生成唯一文件名
function generateFilename(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  const ext = originalName.includes('.')
    ? originalName.substring(originalName.lastIndexOf('.'))
    : ''
  return `${timestamp}-${random}${ext}`
}

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

    const formData = await request.formData()
    const video = formData.get('video') as File
    const cover = formData.get('cover') as File | null
    const englishSubtitle = formData.get('englishSubtitle') as File | null
    const chineseSubtitle = formData.get('chineseSubtitle') as File | null
    const title = formData.get('title') as string
    const description = formData.get('description') as string | null
    const category = formData.get('category') as string | null
    const duration = formData.get('duration') as string | null
    const difficulty = formData.get('difficulty') as string | null

    // 验证必填字段
    if (!video || !title) {
      return NextResponse.json(
        { success: false, error: '请填写所有必填字段' },
        { status: 400 }
      )
    }

    // 验证视频文件类型
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime']
    if (!validVideoTypes.includes(video.type)) {
      return NextResponse.json(
        { success: false, error: '不支持的视频格式，请使用 MP4、WebM 或 MOV 格式' },
        { status: 400 }
      )
    }

    console.log('[UPLOAD] 开始上传视频:', title)

    // 上传视频文件到Supabase Storage
    const videoResult = await uploadFile(video, 'videos', 'videos')
    if (videoResult.error || !videoResult.url) {
      console.error('[UPLOAD] 视频上传失败:', videoResult.error)
      return NextResponse.json(
        { success: false, error: `视频上传失败: ${videoResult.error}` },
        { status: 500 }
      )
    }
    console.log('[UPLOAD] 视频上传成功:', videoResult.url)

    // 上传封面（如果提供）
    let coverUrl: string | null = null
    if (cover && cover.size > 0) {
      const coverResult = await uploadFile(cover, 'videos', 'covers')
      if (!coverResult.error && coverResult.url) {
        coverUrl = coverResult.url
        console.log('[UPLOAD] 封面上传成功:', coverUrl)
      } else {
        console.error('[UPLOAD] 封面上传失败:', coverResult.error)
      }
    }

    // 解析时长
    const parsedDuration = duration ? parseInt(duration) : 300

    // 创建视频记录
    let videoRecord
    try {
      videoRecord = await prisma.video.create({
        data: {
          title,
          description,
          filePath: videoResult.url, // 保存Supabase URL
          coverPath: coverUrl,
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

    // 处理字幕
    if (englishSubtitle || chineseSubtitle) {
      let englishSegments: any[] = []
      let chineseSegments: any[] = []

      // 解析英文字幕
      if (englishSubtitle) {
        try {
          const enContent = await englishSubtitle.text()
          englishSegments = parseSubtitle(enContent, englishSubtitle.name)

          // 上传字幕文件到Supabase Storage
          const enFilename = generateFilename(englishSubtitle.name)
          const enBuffer = Buffer.from(await englishSubtitle.arrayBuffer())
          const enResult = await uploadFile(
            new File([enBuffer], enFilename, { type: englishSubtitle.type }),
            'videos',
            'subtitles'
          )

          await prisma.subtitle.create({
            data: {
              videoId: videoRecord.id,
              language: 'EN',
              content: JSON.stringify(englishSegments),
              filePath: enResult.url // 保存Supabase URL
            }
          })
          console.log('[UPLOAD] 英文字幕已上传')
        } catch (error) {
          console.error('[UPLOAD] 处理英文字幕失败:', error)
        }
      }

      // 解析中文字幕
      if (chineseSubtitle) {
        try {
          const zhContent = await chineseSubtitle.text()
          chineseSegments = parseSubtitle(zhContent, chineseSubtitle.name)

          // 上传字幕文件到Supabase Storage
          const zhFilename = generateFilename(chineseSubtitle.name)
          const zhBuffer = Buffer.from(await chineseSubtitle.arrayBuffer())
          const zhResult = await uploadFile(
            new File([zhBuffer], zhFilename, { type: chineseSubtitle.type }),
            'videos',
            'subtitles'
          )

          await prisma.subtitle.create({
            data: {
              videoId: videoRecord.id,
              language: 'ZH',
              content: JSON.stringify(chineseSegments),
              filePath: zhResult.url // 保存Supabase URL
            }
          })
          console.log('[UPLOAD] 中文字幕已上传')
        } catch (error) {
          console.error('[UPLOAD] 处理中文字幕失败:', error)
        }
      }

      // 如果两种字幕都有，创建合并版本
      if (englishSegments.length > 0 && chineseSegments.length > 0) {
        const merged = mergeSubtitles(englishSegments, chineseSegments)
        // 更新英文字幕为合并版本
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

          // 更新视频难度
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
      { success: false, error: '上传失败，请稍后重试' },
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
