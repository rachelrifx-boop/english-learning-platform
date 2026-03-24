import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'

// 获取字幕生成状态
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const videoId = searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: '缺少视频 ID' },
        { status: 400 }
      )
    }

    // 检查状态文件
    const statusFile = path.join(process.cwd(), 'public', 'uploads', 'temp', `subtitle-status-${videoId}.json`)

    if (!existsSync(statusFile)) {
      return NextResponse.json({
        success: true,
        data: {
          status: 'not_started',
          progress: 0,
          message: '未开始'
        }
      })
    }

    const content = await readFile(statusFile, 'utf-8')
    const statusData = JSON.parse(content)

    return NextResponse.json({
      success: true,
      data: statusData
    })

  } catch (error: any) {
    console.error('获取字幕状态失败:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
