import { NextRequest, NextResponse } from 'next/server'
import { lookupWord } from '@/lib/dictionary-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const word = searchParams.get('word')

    if (!word) {
      return NextResponse.json(
        { success: false, error: '请提供单词' },
        { status: 400 }
      )
    }

    const entry = await lookupWord(word)

    if (!entry) {
      return NextResponse.json(
        { success: false, error: '未找到该单词' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { entry }
    })
  } catch (error) {
    console.error('Lookup word error:', error)
    return NextResponse.json(
      { success: false, error: '查词失败' },
      { status: 500 }
    )
  }
}
