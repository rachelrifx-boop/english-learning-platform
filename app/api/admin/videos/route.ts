import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getVideoInfo, generateThumbnail, isValidVideoFile } from '@/lib/video-processor'
import { parseSubtitle, mergeSubtitles } from '@/lib/subtitle-parser'
import { analyzeDifficulty } from '@/lib/difficulty-analyzer'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// 确保 uploads 目录存在
async function ensureUploadDir() {
  const dirs = [
    path.join(process.cwd(), 'public', 'uploads', 'videos'),
    path.join(process.cwd(), 'public', 'uploads', 'covers'),
    path.join(process.cwd(), 'public', 'uploads', 'subtitles')
  ]

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }
  }
}

// 生成唯一文件名
function generateFilename(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  const ext = path.extname(originalName)
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

    await ensureUploadDir()

    const formData = await request.formData()
    const video = formData.get('video') as File
    const cover = formData.get('cover') as File | null
    const englishSubtitle = formData.get('englishSubtitle') as File | null
    const chineseSubtitle = formData.get('chineseSubtitle') as File | null
    const title = formData.get('title') as string
    const description = formData.get('description') as string | null
    const difficulty = formData.get('difficulty') as string
    const category = formData.get('category') as string | null

    // 验证必填字段
    if (!video || !title || !difficulty) {
      return NextResponse.json(
        { success: false, error: '请填写所有必填字段' },
        { status: 400 }
      )
    }

    // 验证视频文件
    if (!isValidVideoFile(video.name)) {
      return NextResponse.json(
        { success: false, error: '不支持的视频格式' },
        { status: 400 }
      )
    }

    // 保存视频文件
    const videoFilename = generateFilename(video.name)
    const videoPath = path.join(process.cwd(), 'public', 'uploads', 'videos', videoFilename)

    try {
      const videoBuffer = Buffer.from(await video.arrayBuffer())
      await writeFile(videoPath, videoBuffer)
      console.log(`视频文件已保存: ${videoFilename}`)
    } catch (error) {
      console.error('保存视频文件失败:', error)
      return NextResponse.json(
        { success: false, error: '保存视频文件失败' },
        { status: 500 }
      )
    }

    // 获取视频时长（增加超时时间到 35 秒）
    let duration = 300 // 默认 5 分钟
    try {
      const infoPromise = getVideoInfo(videoPath)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('超时')), 35000) // 增加到 35 秒
      )

      const info = await Promise.race([infoPromise, timeoutPromise]) as any
      duration = Math.round(info.duration || 300)
      console.log(`视频时长: ${duration}秒`)
    } catch (error) {
      console.log('获取视频时长超时或失败，使用默认值 300 秒')
      duration = 300
    }

    // 保存封面（如果提供）
    let coverPath: string | null = null
    if (cover && cover.size > 0) {
      try {
        const coverFilename = generateFilename(cover.name)
        const coverFilePath = path.join(process.cwd(), 'public', 'uploads', 'covers', coverFilename)
        const coverBuffer = Buffer.from(await cover.arrayBuffer())
        await writeFile(coverFilePath, coverBuffer)
        coverPath = `/uploads/covers/${coverFilename}`
        console.log(`封面已保存: ${coverFilename}`)
      } catch (error) {
        console.error('保存封面失败:', error)
        // 封面保存失败不影响整体上传
      }
    }

    // 如果没有提供封面，自动从视频截取首帧作为封面
    if (!coverPath) {
      try {
        console.log('未提供封面，自动截取视频首帧...')
        const coverFilename = `cover-${videoFilename.replace('.mp4', '.jpg')}`
        const coverFilePath = path.join(process.cwd(), 'public', 'uploads', 'covers', coverFilename)

        // 使用视频的第1秒作为封面（如果视频很短，使用第0.5秒）
        const timestamp = duration > 5 ? 1 : 0.5

        await generateThumbnail(videoPath, coverFilePath, timestamp)
        coverPath = `/uploads/covers/${coverFilename}`
        console.log(`✓ 自动封面已生成: ${coverFilename}`)
      } catch (error) {
        console.error('自动生成封面失败:', error)
        // 封面生成失败不影响整体上传
        coverPath = null
      }
    }

    // 创建视频记录
    let videoRecord
    try {
      videoRecord = await prisma.video.create({
        data: {
          title,
          description,
          filePath: `/uploads/videos/${videoFilename}`,
          coverPath,
          duration,
          difficulty: difficulty as any,
          category
        }
      })
      console.log(`视频记录已创建: ${videoRecord.id}`)
    } catch (error) {
      console.error('创建视频记录失败:', error)
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
        const enContent = await englishSubtitle.text()
        englishSegments = parseSubtitle(enContent, englishSubtitle.name)

        // 保存字幕文件
        const enFilename = generateFilename(englishSubtitle.name)
        const enFilePath = path.join(process.cwd(), 'public', 'uploads', 'subtitles', enFilename)
        await writeFile(enFilePath, Buffer.from(await englishSubtitle.arrayBuffer()))

        await prisma.subtitle.create({
          data: {
            videoId: videoRecord.id,
            language: 'EN',
            content: JSON.stringify(englishSegments),
            filePath: `/uploads/subtitles/${enFilename}`
          }
        })
      }

      // 解析中文字幕
      if (chineseSubtitle) {
        const zhContent = await chineseSubtitle.text()
        chineseSegments = parseSubtitle(zhContent, chineseSubtitle.name)

        // 保存字幕文件
        const zhFilename = generateFilename(chineseSubtitle.name)
        const zhFilePath = path.join(process.cwd(), 'public', 'uploads', 'subtitles', zhFilename)
        await writeFile(zhFilePath, Buffer.from(await chineseSubtitle.arrayBuffer()))

        await prisma.subtitle.create({
          data: {
            videoId: videoRecord.id,
            language: 'ZH',
            content: JSON.stringify(chineseSegments),
            filePath: `/uploads/subtitles/${zhFilename}`
          }
        })
      }

      // 如果两种字幕都有，创建合并版本
      if (englishSegments.length > 0 && chineseSegments.length > 0) {
        const merged = mergeSubtitles(englishSegments, chineseSegments)
        // 更新英文字幕为合并版本
        await prisma.subtitle.updateMany({
          where: { videoId: videoRecord.id, language: 'EN' },
          data: { content: JSON.stringify(merged) }
        })
      }

      // 自动分析难度级别（如果有英文字幕）
      if (englishSegments.length > 0) {
        try {
          console.log('开始自动分析视频难度...')
          const difficultyResult = analyzeDifficulty(englishSegments, duration)

          console.log(`难度分析结果: ${difficultyResult.level}`)
          console.log(`置信度: ${difficultyResult.confidence}`)
          console.log(`详细信息:`, difficultyResult.details)

          // 更新视频难度
          await prisma.video.update({
            where: { id: videoRecord.id },
            data: { difficulty: difficultyResult.level }
          })

          videoRecord = { ...videoRecord, difficulty: difficultyResult.level }
          console.log(`✓ 已自动设置难度为: ${difficultyResult.level}`)
        } catch (error) {
          console.error('自动难度分析失败，使用用户指定的难度:', error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { video: videoRecord }
    })
  } catch (error) {
    console.error('Upload video error:', error)
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
