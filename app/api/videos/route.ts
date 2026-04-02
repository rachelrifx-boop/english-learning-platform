import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface PaginationParams {
  page?: number
  limit?: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const difficulty = searchParams.get('difficulty')
    const category = searchParams.get('category')
    const duration = searchParams.get('duration')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')

    // 验证分页参数
    const validPage = Math.max(1, page)
    const validLimit = Math.min(Math.max(1, limit), 1000) // 最多每页1000条

    const where: any = {}
    if (difficulty) {
      where.difficulty = difficulty
    }
    if (category) {
      where.category = category
    }

    // 搜索功能 - 根据标题或描述搜索
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    // 处理时长筛选（duration字段单位是秒）
    if (duration) {
      if (duration === '0-5') {
        where.duration = { gte: 0, lte: 300 } // 0-5分钟
      } else if (duration === '5-10') {
        where.duration = { gt: 300, lte: 600 } // 5-10分钟
      } else if (duration === '10-20') {
        where.duration = { gt: 600, lte: 1200 } // 10-20分钟
      } else if (duration === '20+') {
        where.duration = { gt: 1200 } // 20分钟以上
      }
    }

    // 并行执行查询以提高性能
    const [videos, totalCount, categories] = await Promise.all([
      // 查询视频列表（分页）
      prisma.video.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          coverPath: true,
          duration: true,
          difficulty: true,
          category: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (validPage - 1) * validLimit,
        take: validLimit
      }),
      // 查询总数
      prisma.video.count({ where }),
      // 获取所有分类（仅第一页时查询）
      validPage === 1
        ? prisma.video.findMany({
            select: { category: true },
            where: { category: { not: null } },
            distinct: ['category']
          })
        : Promise.resolve([])
    ])

    // 获取用户ID以查询收藏状态
    let favoriteVideoIds: Set<string> = new Set()

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (token) {
      try {
        const payload = await verifyToken(token)
        if (payload?.userId) {
          // 批量查询用户的收藏状态（避免 N+1 问题）
          const favorites = await prisma.favoriteVideo.findMany({
            where: {
              userId: payload.userId,
              videoId: { in: videos.map(v => v.id) }
            },
            select: { videoId: true }
          })
          favoriteVideoIds = new Set(favorites.map(f => f.videoId))
        }
      } catch (e) {
        // token 无效，忽略
      }
    }

    // 为每个视频添加收藏状态
    const videosWithFavoriteStatus = videos.map(video => ({
      ...video,
      isFavorited: favoriteVideoIds.has(video.id)
    }))

    return NextResponse.json({
      success: true,
      data: {
        videos: videosWithFavoriteStatus,
        categories: categories.map(c => c.category).filter(Boolean),
        pagination: {
          page: validPage,
          limit: validLimit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / validLimit)
        }
      }
    })
  } catch (error) {
    console.error('Get videos error:', error)
    return NextResponse.json(
      { success: false, error: '获取视频列表失败' },
      { status: 500 }
    )
  }
}
