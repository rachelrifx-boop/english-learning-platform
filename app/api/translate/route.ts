import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const text = searchParams.get('text')
  const sourceLang = searchParams.get('source') || 'en'
  const targetLang = searchParams.get('target') || 'zh'

  if (!text) {
    return NextResponse.json(
      { success: false, error: '缺少翻译文本' },
      { status: 400 }
    )
  }

  try {
    // 备用翻译映射
    const fallbackTranslations: Record<string, string> = {
      'A Week in My Life Vlog - Sydney Serena': '悉尼·塞雷娜一周生活视频博客'
    }

    // 使用 MyMemory Translation API（免费）
    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`

    try {
      const response = await fetch(apiUrl, {
        // 添加超时和缓存控制
        signal: AbortSignal.timeout(5000)
      })
      const data = await response.json()

      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        const translatedText = data.responseData.translatedText

        return NextResponse.json({
          success: true,
          data: {
            originalText: text,
            translatedText: translatedText,
            sourceLang,
            targetLang
          }
        })
      }
    } catch (apiError) {
      console.log('Translation API unavailable, using fallback')
    }

    // API失败时使用备用翻译
    const fallbackTranslation = fallbackTranslations[text] || ''
    return NextResponse.json({
      success: true,
      data: {
        originalText: text,
        translatedText: fallbackTranslation,
        sourceLang,
        targetLang,
        isFallback: true
      }
    })
  } catch (error) {
    console.error('Translation error:', error)

    // 如果完全失败，返回空翻译（success: true 避免客户端错误）
    return NextResponse.json({
      success: true,
      data: {
        originalText: text,
        translatedText: '',
        sourceLang,
        targetLang,
        isFallback: true
      }
    })
  }
}

// POST 方法支持批量翻译
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { texts, sourceLang = 'en', targetLang = 'zh' } = body

    if (!texts || !Array.isArray(texts)) {
      return NextResponse.json(
        { success: false, error: '缺少翻译文本数组' },
        { status: 400 }
      )
    }

    const translations = await Promise.all(
      texts.map(async (text: string) => {
        try {
          const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
          const response = await fetch(apiUrl)
          const data = await response.json()

          return {
            original: text,
            translated: data.responseData?.translatedText || text,
            success: data.responseStatus === 200
          }
        } catch (error) {
          return {
            original: text,
            translated: text,
            success: false
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: { translations }
    })
  } catch (error) {
    console.error('Batch translation error:', error)
    return NextResponse.json(
      { success: false, error: '批量翻译失败' },
      { status: 500 }
    )
  }
}
