import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// 使用 ffprobe 获取视频时长
async function getVideoDuration(videoUrl: string): Promise<number | null> {
  try {
    // 如果是相对路径，转换为完整 URL
    let fullUrl = videoUrl
    if (videoUrl.startsWith('/api/video-proxy/')) {
      fullUrl = `http://localhost:3000${videoUrl}`
    }

    console.log('[UPDATE DURATION] 获取视频时长:', fullUrl)

    // 使用 ffprobe 获取视频时长
    const command = `"C:\\ffmpeg\\bin\\ffprobe.exe" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${fullUrl}"`
    const { stdout } = await execAsync(command, { timeout: 30000 })

    const duration = parseFloat(stdout.trim())
    console.log('[UPDATE DURATION] 视频时长:', duration, '秒')

    if (isNaN(duration)) {
      console.error('[UPDATE DURATION] 无法解析时长:', stdout)
      return null
    }

    return Math.round(duration)
  } catch (error: any) {
    console.error('[UPDATE DURATION] 获取视频时长失败:', error?.message || error)
    return null
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
    const { videoId } = body

    if (!videoId) {
      return NextResponse.json({ success: false, error: '请提供视频ID' }, { status: 400 })
    }

    // 获取视频记录
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    })

    if (!video) {
      return NextResponse.json({ success: false, error: '视频不存在' }, { status: 404 })
    }

    console.log('[UPDATE DURATION] 开始更新视频时长:', video.title)
    console.log('[UPDATE DURATION] 当前时长:', video.duration, '秒')

    // 获取实际视频时长
    const actualDuration = await getVideoDuration(video.filePath)

    if (actualDuration === null) {
      return NextResponse.json({ success: false, error: '无法获取视频时长' }, { status: 500 })
    }

    // 更新数据库
    await prisma.video.update({
      where: { id: videoId },
      data: { duration: actualDuration }
    })

    console.log('[UPDATE DURATION] 时长已更新:', actualDuration, '秒')

    return NextResponse.json({
      success: true,
      data: {
        oldDuration: video.duration,
        newDuration: actualDuration,
        formatted: `${Math.floor(actualDuration / 60)}:${(actualDuration % 60).toString().padStart(2, '0')}`
      }
    })
  } catch (error: any) {
    console.error('[UPDATE DURATION] Error:', error)
    return NextResponse.json(
      { success: false, error: '更新视频时长失败' },
      { status: 500 }
    )
  }
}

// 批量更新所有视频时长
export async function GET(request: NextRequest) {
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

    // 获取所有视频
    const videos = await prisma.video.findMany()

    const results = []

    for (const video of videos) {
      console.log(`[UPDATE DURATION] 处理视频: ${video.title}`)

      const actualDuration = await getVideoDuration(video.filePath)

      if (actualDuration !== null && actualDuration !== video.duration) {
        await prisma.video.update({
          where: { id: video.id },
          data: { duration: actualDuration }
        })

        results.push({
          id: video.id,
          title: video.title,
          oldDuration: video.duration,
          newDuration: actualDuration
        })

        console.log(`[UPDATE DURATION] 已更新: ${video.title} ${video.duration} -> ${actualDuration}`)
      }

      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return NextResponse.json({
      success: true,
      data: { results }
    })
  } catch (error: any) {
    console.error('[UPDATE DURATION] Error:', error)
    return NextResponse.json(
      { success: false, error: '批量更新视频时长失败' },
      { status: 500 }
    )
  }
}
