import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 获取用户的单词本
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Token 无效' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')

    const where: any = { userId: payload.userId }
    if (videoId) {
      where.videoId = videoId
    }

    const words = await prisma.word.findMany({
      where,
      include: {
        video: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: { words }
    })
  } catch (error) {
    console.error('Get words error:', error)
    return NextResponse.json(
      { success: false, error: '获取单词本失败' },
      { status: 500 }
    )
  }
}

// 添加单词到单词本
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Token 无效' }, { status: 401 })
    }

    const body = await request.json()
    const {
      videoId,
      word,
      definition,
      translation,
      partOfSpeech,
      sentence,
      sentenceTranslation,
      usPhonetic,
      ukPhonetic,
      collocations,
      synonyms,
      antonyms,
      timestamp
    } = body

    if (!videoId || !word) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 检查是否已收藏
    const existing = await prisma.word.findFirst({
      where: {
        userId: payload.userId,
        videoId,
        word: word.toLowerCase()
      }
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: '该单词已收藏' },
        { status: 400 }
      )
    }

    const wordEntry = await prisma.word.create({
      data: {
        userId: payload.userId,
        videoId,
        word: word.toLowerCase(),
        definition,
        translation,
        partOfSpeech,
        sentence,
        sentenceTranslation,
        usPhonetic,
        ukPhonetic,
        collocations: collocations ? JSON.stringify(collocations) : null,
        synonyms: synonyms ? JSON.stringify(synonyms) : null,
        antonyms: antonyms ? JSON.stringify(antonyms) : null,
        timestamp
      }
    })

    return NextResponse.json({
      success: true,
      data: { word: wordEntry }
    })
  } catch (error) {
    console.error('Add word error:', error)
    return NextResponse.json(
      { success: false, error: '添加单词失败' },
      { status: 500 }
    )
  }
}

// 删除单词
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Token 无效' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const wordId = searchParams.get('id')

    if (!wordId) {
      return NextResponse.json(
        { success: false, error: '缺少单词 ID' },
        { status: 400 }
      )
    }

    // 验证所有权
    const word = await prisma.word.findUnique({
      where: { id: wordId }
    })

    if (!word || word.userId !== payload.userId) {
      return NextResponse.json(
        { success: false, error: '无权删除该单词' },
        { status: 403 }
      )
    }

    await prisma.word.delete({
      where: { id: wordId }
    })

    return NextResponse.json({
      success: true,
      message: '删除成功'
    })
  } catch (error) {
    console.error('Delete word error:', error)
    return NextResponse.json(
      { success: false, error: '删除单词失败' },
      { status: 500 }
    )
  }
}
