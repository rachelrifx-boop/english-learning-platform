import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const difficulty = searchParams.get('difficulty')
    const category = searchParams.get('category')

    const where: any = {}
    if (difficulty) {
      where.difficulty = difficulty
    }
    if (category) {
      where.category = category
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
