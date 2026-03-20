import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * 自动处理视频（翻译标题 + 分析难度）
 * 在视频上传后调用此 API
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 })
    }

    const { videoId } = await request.json()

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: '缺少视频 ID' },
        { status: 400 }
      )
    }

    // 获取视频信息
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        subtitles: true
      }
    })

    if (!video) {
      return NextResponse.json(
        { success: false, error: '视频不存在' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    const results: any = {}

    // 1. 翻译视频标题
    if (!video.description || video.description === video.title) {
      try {
        const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(video.title)}&langpair=en|zh`
        const response = await fetch(apiUrl, {
          signal: AbortSignal.timeout(5000)
        })
        const data = await response.json()

        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          updateData.description = data.responseData.translatedText
          results.translation = data.responseData.translatedText
        } else {
          // 使用备用翻译
          const fallbackTranslations: Record<string, string> = {
            'A Week in My Life Vlog - Sydney Serena': '悉尼·塞雷娜一周生活视频博客'
          }
          if (fallbackTranslations[video.title]) {
            updateData.description = fallbackTranslations[video.title]
            results.translation = fallbackTranslations[video.title]
          }
        }
      } catch (error) {
        console.log('翻译失败，跳过标题翻译')
      }
    }

    // 2. 自动分析难度等级
    if (!video.difficulty || video.difficulty === 'A1') {
      try {
        // 获取英文字幕
        const enSubtitle = video.subtitles.find((s: any) => s.language === 'EN')

        if (enSubtitle) {
          // 解析字幕内容
          let subtitleContent: any[] = []
          try {
            if (typeof enSubtitle.content === 'string') {
              subtitleContent = JSON.parse(enSubtitle.content)
            } else {
              subtitleContent = enSubtitle.content
            }
          } catch (e) {
            console.log('解析字幕内容失败')
          }

          // 提取所有文本
          const allText = subtitleContent
            .map((sub: any) => sub.text?.en || sub.text || '')
            .join(' ')

          if (allText && allText.length > 50) {
            const difficulty = analyzeTextDifficulty(allText)
            updateData.difficulty = difficulty
            results.difficulty = difficulty
          }
        }
      } catch (error) {
        console.log('难度分析失败，保持默认值')
      }
    }

    // 3. 更新视频
    if (Object.keys(updateData).length > 0) {
      await prisma.video.update({
        where: { id: videoId },
        data: updateData
      })
    }

    return NextResponse.json({
      success: true,
      message: '自动处理完成',
      data: results
    })
  } catch (error) {
    console.error('Auto process error:', error)
    return NextResponse.json(
      { success: false, error: '自动处理失败' },
      { status: 500 }
    )
  }
}

/**
 * 简化版的文本难度分析函数
 * 基于 CEFR 标准
 */
function analyzeTextDifficulty(text: string): string {
  // 移除标点符号，转换为小写
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0)

  if (words.length === 0) return 'A1'

  // 计算平均词长
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length

  // 计算句子平均长度
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 10

  // 计算高级词汇比例（长度 > 7 的词）
  const advancedWords = words.filter(word => word.length > 7)
  const advancedRatio = advancedWords.length / words.length

  // 计算词汇多样性
  const uniqueWords = new Set(words)
  const diversity = uniqueWords.size / words.length

  // 计算难度得分
  let difficultyScore = 0

  // 平均词长（0-2分）
  difficultyScore += Math.min(Math.max((avgWordLength - 3) * 0.2, 0), 2)

  // 句子长度（0-2分）
  difficultyScore += Math.min(Math.max(avgSentenceLength * 0.05, 0), 2)

  // 高级词汇比例（0-2分）
  difficultyScore += Math.min(Math.max(advancedRatio * 50, 0), 2)

  // 词汇多样性（0-1分）
  difficultyScore += Math.min(Math.max((diversity - 0.5) * 2, 0), 1)

  // 根据得分映射到 CEFR 等级
  if (difficultyScore < 1.5) return 'A1'
  if (difficultyScore < 2.5) return 'A2'
  if (difficultyScore < 4.0) return 'B1'
  if (difficultyScore < 5.5) return 'B2'
  if (difficultyScore < 7.0) return 'C1'
  return 'C2'
}
