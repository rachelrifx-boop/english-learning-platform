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

    // 将空字符串转换为 null，避免数据库约束问题
    const sanitizedCategory = category && category.trim() !== '' ? category : null
    const sanitizedDescription = description && description.trim() !== '' ? description : null
    const sanitizedCoverUrl = coverUrl && coverUrl.trim() !== '' ? coverUrl : null

    console.log('[UPLOAD] 开始创建视频记录:', title)
    console.log('[UPLOAD] 接收到的完整数据:', JSON.stringify(body, null, 2))

    // 解析时长
    const parsedDuration = duration ? parseInt(duration) : 300
    console.log('[UPLOAD] 解析后的时长:', parsedDuration, '原始值:', duration)

    // 创建视频记录
    let videoRecord
    try {
      // 记录每个字段的长度
      console.log('[UPLOAD] 字段长度检查:')
      console.log('  title:', title.length, JSON.stringify(title))
      console.log('  description:', description?.length || 0, description ? JSON.stringify(description.substring(0, 50)) : 'null')
      console.log('  filePath:', videoUrl.length, JSON.stringify(videoUrl))
      console.log('  coverPath:', coverUrl?.length || 0, coverUrl ? JSON.stringify(coverUrl.substring(0, 50)) : 'null')
      console.log('  duration:', parsedDuration)
      console.log('  difficulty:', difficulty?.length || 0, JSON.stringify(difficulty))
      console.log('  category:', category?.length || 0, JSON.stringify(category))

      // 使用原始 SQL 插入，绕过 Prisma 的类型检查问题
      const videoId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
      const escapedTitle = title.replace(/'/g, "''")
      const escapedFilePath = videoUrl.replace(/'/g, "''")
      const escapedDifficulty = (difficulty || 'B1').replace(/'/g, "''")
      const escapedCoverPath = sanitizedCoverUrl ? `'${sanitizedCoverUrl.replace(/'/g, "''")}'` : 'NULL'
      const escapedDescription = sanitizedDescription ? `'${sanitizedDescription.replace(/'/g, "''")}'` : 'NULL'
      const escapedCategory = sanitizedCategory ? `'${sanitizedCategory.replace(/'/g, "''")}'` : 'NULL'

      await prisma.$executeRawUnsafe(`
        INSERT INTO "Video" (id, title, description, "filePath", "coverPath", duration, difficulty, category, "createdAt")
        VALUES ('${videoId}', '${escapedTitle}', ${escapedDescription}, '${escapedFilePath}', ${escapedCoverPath}, ${parsedDuration}, '${escapedDifficulty}', ${escapedCategory}, NOW())
      `)

      // 获取创建的记录
      videoRecord = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Video" WHERE id = '${videoId}'`).then(r => r[0])
      console.log('[UPLOAD] 视频记录已创建:', videoRecord.id)
    } catch (error: any) {
      console.error('[UPLOAD] 创建视频记录失败:', error)
      console.error('[UPLOAD] Error details:', {
        message: error?.message,
        code: error?.code,
        meta: error?.meta,
        cause: error?.cause
      })
      return NextResponse.json(
        {
          success: false,
          error: '创建视频记录失败',
          details: {
            message: error?.message,
            code: error?.code,
            meta: error?.meta
          }
        },
        { status: 500 }
      )
    }

    // 处理字幕URL（使用 Promise.allSettled 并行处理，提高效率）
    if (englishSubtitleUrl || chineseSubtitleUrl) {
      let englishSegments: any[] = []
      let chineseSegments: any[] = []

      // 并行下载字幕（带超时）
      const fetchWithTimeout = async (url: string, timeout = 30000) => {
        const controller = new AbortController()
        const id = setTimeout(() => controller.abort(), timeout)
        try {
          const response = await fetch(url, { signal: controller.signal })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          return await response.text()
        } finally {
          clearTimeout(id)
        }
      }

      const subtitlePromises = []

      // 下载英文字幕
      if (englishSubtitleUrl) {
        subtitlePromises.push(
          (async () => {
            try {
              console.log('[UPLOAD] 下载英文字幕...')
              const content = await fetchWithTimeout(englishSubtitleUrl, 30000)
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
            } catch (error: any) {
              console.error('[UPLOAD] 处理英文字幕失败:', error?.message || error)
            }
          })()
        )
      }

      // 下载中文字幕
      if (chineseSubtitleUrl) {
        subtitlePromises.push(
          (async () => {
            try {
              console.log('[UPLOAD] 下载中文字幕...')
              const content = await fetchWithTimeout(chineseSubtitleUrl, 30000)
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
            } catch (error: any) {
              console.error('[UPLOAD] 处理中文字幕失败:', error?.message || error)
            }
          })()
        )
      }

      // 等待所有字幕下载完成
      await Promise.all(subtitlePromises)

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
