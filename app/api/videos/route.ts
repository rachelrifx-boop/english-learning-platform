import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const difficulty = searchParams.get('difficulty')
    const category = searchParams.get('category')
    const duration = searchParams.get('duration')
    const search = searchParams.get('search')

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

    const videos = await prisma.video.findMany({
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
      orderBy: { createdAt: 'desc' }
    })

    // 获取所有分类
    const categories = await prisma.video.findMany({
      select: { category: true },
      where: { category: { not: null } },
      distinct: ['category']
    })

    return NextResponse.json({
      success: true,
      data: {
        videos,
        categories: categories.map(c => c.category).filter(Boolean)
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
