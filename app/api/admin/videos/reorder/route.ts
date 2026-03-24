import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const { videoIds } = body

    if (!Array.isArray(videoIds)) {
      return NextResponse.json(
        { success: false, error: 'videoIds 必须是数组' },
        { status: 400 }
      )
    }

    console.log('[REORDER] 更新视频排序，共', videoIds.length, '个视频')

    // 使用原始 SQL 批量更新视频排序（避免 Prisma 客户端缓存问题）
    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i]
      await prisma.$executeRawUnsafe(
        `UPDATE "Video" SET "displayOrder" = $1 WHERE id = $2::uuid`,
        i,
        videoId
      )
    }

    console.log('[REORDER] 排序更新完成')

    return NextResponse.json({
      success: true,
      message: '排序更新成功'
    })
  } catch (error) {
    console.error('[REORDER] Error:', error)
    return NextResponse.json(
      { success: false, error: '更新排序失败: ' + (error as any).message },
      { status: 500 }
    )
  }
}
