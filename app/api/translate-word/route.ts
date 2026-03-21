import { NextRequest, NextResponse } from 'next/server'

// 简单的内存缓存
const translationCache = new Map<string, string>()
const notFoundCache = new Set<string>()
const MAX_CACHE_SIZE = 1000

/**
 * 带超时的fetch
 */
async function fetchWithTimeout(url: string, timeout = 3000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * 获取缓存的翻译
 */
function getCachedTranslation(word: string): string | null {
  const key = word.toLowerCase().trim()
  if (notFoundCache.has(key)) {
    return ''
  }
  return translationCache.get(key) || null
}

/**
 * 设置翻译缓存
 */
function setCachedTranslation(word: string, translation: string): void {
  const key = word.toLowerCase().trim()

  // 如果缓存太大，删除最早的条目
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = translationCache.keys().next().value
    if (firstKey) {
      translationCache.delete(firstKey)
    }
  }

  if (translation) {
    translationCache.set(key, translation)
  } else {
    notFoundCache.add(key)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const word = searchParams.get('word')

    if (!word) {
      return NextResponse.json(
        { success: false, error: '缺少单词' },
        { status: 400 }
      )
    }

    const normalizedWord = word.toLowerCase().trim()

    // 检查缓存
    const cached = getCachedTranslation(normalizedWord)
    if (cached !== null) {
      return NextResponse.json({
        success: true,
        data: {
          word,
          translation: cached,
          cached: true
        }
      })
    }

    // 使用 Google Translate 的非官方API（更可靠）
    // 使用多个翻译源作为备用
    let translatedText = ''

    try {
      // 方法1: 使用 Google Translate 的非官方接口
      const googleApiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(word)}`
      const response = await fetchWithTimeout(googleApiUrl, 3000) // 3秒超时

      if (response.ok) {
        const data = await response.json()
        if (data && data[0] && data[0][0] && data[0][0][0]) {
          translatedText = data[0][0][0]
        }
      }
    } catch (error) {
      console.log('Google Translate failed, trying MyMemory...')
    }

    // 如果 Google Translate 失败，使用 MyMemory 作为备用
    if (!translatedText) {
      try {
        const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|zh-CN`
        const response = await fetchWithTimeout(myMemoryUrl, 3000) // 3秒超时
        const data = await response.json()

        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          // 确保翻译结果不是原文（有时API会返回原文）
          const result = data.responseData.translatedText
          if (result.toLowerCase() !== word.toLowerCase()) {
            translatedText = result
          }
        }
      } catch (error) {
        console.log('MyMemory failed')
      }
    }

    // 缓存结果
    setCachedTranslation(normalizedWord, translatedText)

    return NextResponse.json({
      success: true,
      data: {
        word,
        translation: translatedText
      }
    })
  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json(
      {
        success: true,
        data: { translation: '' }
      },
      { status: 200 }
    )
  }
}
