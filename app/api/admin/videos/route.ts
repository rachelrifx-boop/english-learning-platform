import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseSubtitle, mergeSubtitles } from '@/lib/subtitle-parser'
import { analyzeDifficulty } from '@/lib/difficulty-analyzer'
import { extractAndUploadCover } from '@/lib/video-processor'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// 使用 ffprobe 获取视频时长
async function getVideoDuration(videoUrl: string): Promise<number | null> {
  // 使用与批量更新相同的逻辑
  const { existsSync } = require('fs')
  const path = require('path')
  const { writeFile, unlink } = require('fs/promises')
  const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')
  const { Readable } = require('stream')

  let localVideoPath: string | null = null
  let downloadedVideo = false

  try {
    // 首先尝试本地路径
    const localPath = path.join(process.cwd(), 'public', videoUrl)
    if (existsSync(localPath)) {
      console.log('[UPLOAD] 使用本地视频文件')
      localVideoPath = localPath
    } else {
      // 本地没有，从 R2 下载
      console.log('[UPLOAD] 本地无视频，从 R2 下载...')

      const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
      const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
      const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
      const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos'

      if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
        console.log('[UPLOAD] R2 配置不完整，使用默认时长')
        return null
      }

      const r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
        },
      })

      const tempDir = path.join(process.cwd(), 'public', 'uploads', 'temp')
      const videoFilename = `upload-duration-${Date.now()}.mp4`
      localVideoPath = path.join(tempDir, videoFilename)

      const command = new GetObjectCommand({
        Bucket: r2BucketName,
        Key: videoUrl,
      })

      const response = await r2Client.send(command)
      const body = response.Body

      if (body instanceof Readable) {
        const chunks: Buffer[] = []
        for await (const chunk of body) {
          chunks.push(chunk)
        }
        const buffer = Buffer.concat(chunks)
        await writeFile(localVideoPath, buffer)
        downloadedVideo = true
        console.log('[UPLOAD] 视频下载完成')
      } else {
        throw new Error('无法读取 R2 响应流')
      }
    }

    console.log('[UPLOAD] 使用 ffprobe 获取时长:', localVideoPath)

    const command = `"C:\\ffmpeg\\bin\\ffprobe.exe" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${localVideoPath}"`
    const { stdout } = await execAsync(command, { timeout: 120000 })

    const duration = parseFloat(stdout.trim())
    console.log('[UPLOAD] 视频时长:', duration, '秒')

    if (isNaN(duration)) {
      console.error('[UPLOAD] 无法解析时长:', stdout)
      return null
    }

    return Math.round(duration)
  } catch (error: any) {
    console.error('[UPLOAD] 获取视频时长失败:', error?.message || error)
    return null
  } finally {
    // 清理下载的临时视频文件
    if (downloadedVideo && localVideoPath && existsSync(localVideoPath)) {
      try {
        await unlink(localVideoPath)
        console.log('[UPLOAD] 临时视频文件已删除')
      } catch (e) {
        console.warn('[UPLOAD] 删除临时视频文件失败:', e)
      }
    }
  }
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

    // 解析时长 - 如果前端没有提供，自动获取
    let parsedDuration = duration ? parseInt(duration) : null

    if (!parsedDuration || parsedDuration <= 0) {
      console.log('[UPLOAD] 前端未提供时长，自动获取中...')
      const autoDuration = await getVideoDuration(videoUrl)
      if (autoDuration !== null) {
        parsedDuration = autoDuration
      } else {
        // 如果自动获取失败，使用默认值
        parsedDuration = 300
        console.log('[UPLOAD] 自动获取时长失败，使用默认值 300 秒')
      }
    }

    console.log('[UPLOAD] 最终时长:', parsedDuration, '秒')

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

      // 如果没有提供封面，自动生成
      if (!sanitizedCoverUrl) {
        console.log('[UPLOAD] 未提供封面，开始自动生成...')
        const autoCoverUrl = await extractAndUploadCover(videoUrl)
        if (autoCoverUrl) {
          await prisma.$executeRawUnsafe(`
            UPDATE "Video" SET "coverPath" = '${autoCoverUrl.replace(/'/g, "''")}' WHERE id = '${videoId}'
          `)
          videoRecord.coverPath = autoCoverUrl
          console.log('[UPLOAD] 自动封面生成成功:', autoCoverUrl)
        } else {
          console.log('[UPLOAD] 自动封面生成失败，将继续使用默认封面')
        }
      }
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
