/**
 * 自动处理新上传的视频
 * 功能：
 * 1. 自动翻译视频标题和描述
 * 2. 自动分析并设置难度等级（基于词汇和句子复杂度）
 * 3. 自动翻译字幕（如果是纯英文字幕）
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// CEFR 词汇等级参考（基于词频和长度）
const vocabularyLevels = {
  A1: ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at'],
  A2: ['this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what'],
  B1: ['about', 'if', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'],
  B2: ['find', 'think', 'tell', 'ask', 'work', 'seem', 'feel', 'try', 'leave', 'call', 'should', 'need', 'become', 'mean', 'move', 'change', 'pay', 'hold', 'let', 'begin', 'seem', 'help', 'talk', 'turn', 'start', 'might', 'show', 'hear', 'play', 'run', 'like', 'live', 'believe', 'hold', 'bring', 'happen', 'write', 'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue', 'set', 'change', 'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend', 'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build', 'stay', 'fall', 'cut', 'reach', 'kill', 'remain'],
  C1: ['suggest', 'develop', 'require', 'provide', 'indicate', 'establish', 'determine', 'involve', 'significant', 'available', 'particular', 'approach', 'respond', 'concern', 'achieve', 'consider', 'effective', 'generally', 'believe', 'attempt', 'address', 'consist', 'recognize', 'identify', 'encourage', 'establish', 'maintain', 'increase', 'reduce', 'create', 'process', 'affect', 'include', 'continue', 'perform', 'represent', 'demonstrate', 'implement', 'support', 'illustrate', 'relate', 'indicate', 'associate', 'involve', 'experience', 'demonstrate', 'participate', 'contribute', 'communicate', 'differentiate', 'investigate', 'synthesize', 'collaborate', 'facilitate', 'negotiate', 'synthesize', 'hypothesize', 'conceptualize', 'theorize'],
  C2: ['nuance', 'subtle', 'intricate', 'complex', 'sophisticated', 'ambiguous', 'multifaceted', 'paradigm', 'phenomenon', 'empirical', 'theoretical', 'conceptual', 'abstract', 'hypothetical', 'speculative', 'metaphorical', 'allegorical', 'rhetorical', 'pedagogical', 'methodological', 'epistemological', 'ontological', 'phenomenological', 'hermeneutical', 'semiological', 'discursive', 'ideological', 'heterogeneous', 'homogeneous', 'contingent', 'contextual', 'interdisciplinary', 'multidisciplinary', 'transdisciplinary', 'crossdisciplinary']
}

/**
 * 翻译文本
 */
async function translateText(text, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh`
      const response = await fetch(apiUrl)
      const data = await response.json()

      if (data.responseStatus === 200) {
        return data.responseData.translatedText
      }

      if (data.responseStatus === 403 || data.responseStatus === 429) {
        console.log(`  速率限制，等待 2 秒后重试 (${i + 1}/${retries})`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }
    } catch (error) {
      console.log(`  翻译失败，重试中 (${i + 1}/${retries})`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  return null
}

/**
 * 分析文本难度
 * 基于以下因素：
 * 1. 词汇复杂度（单词长度、稀有度）
 * 2. 句子长度
 * 3. 词汇多样性
 */
function analyzeDifficulty(text) {
  // 移除标点符号，转换为小写
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0)

  if (words.length === 0) return 'A1'

  // 1. 计算平均词长
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length

  // 2. 计算句子平均长度
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const avgSentenceLength = sentences.length > 0
    ? words.length / sentences.length
    : 10

  // 3. 计算词汇等级分布
  const levelCounts = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 }
  let advancedWords = 0

  words.forEach(word => {
    let found = false
    for (const [level, levelWords] of Object.entries(vocabularyLevels)) {
      if (levelWords.includes(word)) {
        levelCounts[level]++
        found = true
        break
      }
    }
    if (!found && word.length > 6) {
      advancedWords++
    }
  })

  // 4. 计算词汇多样性（Type-Token Ratio）
  const uniqueWords = new Set(words)
  const diversity = uniqueWords.size / words.length

  // 5. 计算难度得分
  let difficultyScore = 0

  // 平均词长（0-2分，每增加1个字符0.2分）
  difficultyScore += Math.min((avgWordLength - 3) * 0.2, 2)

  // 句子长度（0-2分，每词0.05分，最高2分）
  difficultyScore += Math.min(avgSentenceLength * 0.05, 2)

  // 高级词汇比例（0-2分）
  const advancedRatio = advancedWords / words.length
  difficultyScore += Math.min(advancedRatio * 50, 2)

  // 词汇多样性（0-1分，0.5为基准）
  difficultyScore += Math.min((diversity - 0.5) * 2, 1)

  // C1/C2 词汇比例（0-1分）
  const c1c2Ratio = (levelCounts.C1 + levelCounts.C2) / words.length
  difficultyScore += Math.min(c1c2Ratio * 20, 1)

  // 6. 根据得分映射到 CEFR 等级
  if (difficultyScore < 1.5) return 'A1'
  if (difficultyScore < 2.5) return 'A2'
  if (difficultyScore < 4.0) return 'B1'
  if (difficultyScore < 5.5) return 'B2'
  if (difficultyScore < 7.0) return 'C1'
  return 'C2'
}

/**
 * 分析字幕并确定难度
 */
function analyzeSubtitlesDifficulty(subtitles) {
  // 提取所有文本
  const allText = subtitles
    .map(sub => sub.text?.en || sub.text || '')
    .join(' ')

  if (!allText || allText.length < 50) {
    console.log('  字幕文本太少，无法准确分析，默认为 A2')
    return 'A2'
  }

  const difficulty = analyzeDifficulty(allText)
  console.log(`  字幕分析完成，难度等级: ${difficulty}`)
  return difficulty
}

/**
 * 处理单个视频
 */
async function processVideo(video) {
  console.log(`\n处理视频: ${video.title}`)

  let needsUpdate = false
  const updateData = {}

  // 1. 翻译视频标题（如果还没有翻译）
  if (!video.description || video.description === video.title) {
    console.log('  翻译视频标题...')
    const translatedTitle = await translateText(video.title)
    if (translatedTitle) {
      updateData.description = translatedTitle
      needsUpdate = true
      console.log(`  ✓ 标题翻译: ${translatedTitle}`)
    }
  }

  // 2. 自动确定难度等级（如果是默认值或未设置）
  if (!video.difficulty || video.difficulty === 'A1') {
    console.log('  分析字幕确定难度等级...')

    // 获取字幕
    const subtitles = await prisma.subtitle.findMany({
      where: { videoId: video.id },
      include: { content: true }
    })

    if (subtitles.length > 0) {
      // 解析字幕内容
      let subtitleContent = []
      subtitles.forEach(subtitle => {
        try {
          if (typeof subtitle.content === 'string') {
            subtitleContent = JSON.parse(subtitle.content)
          } else {
            subtitleContent = subtitle.content
          }
        } catch (e) {
          console.log('  解析字幕内容失败')
        }
      })

      if (subtitleContent.length > 0) {
        const difficulty = analyzeSubtitlesDifficulty(subtitleContent)
        updateData.difficulty = difficulty
        needsUpdate = true
      }
    }
  }

  // 3. 更新视频
  if (needsUpdate) {
    await prisma.video.update({
      where: { id: video.id },
      data: updateData
    })
    console.log('  ✓ 视频信息已更新')
  } else {
    console.log('  视频信息已是最新，无需更新')
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('=====================================')
  console.log('自动处理新视频')
  console.log('=====================================')

  try {
    // 查找所有需要处理的视频
    const videos = await prisma.video.findMany({
      where: {
        OR: [
          { description: '' },  // 没有翻译
          { description: null },
          { difficulty: 'A1' },  // 默认难度，可能需要重新评估
        ]
      }
    })

    console.log(`\n找到 ${videos.length} 个需要处理的视频`)

    for (const video of videos) {
      await processVideo(video)
      // 等待 1 秒避免 API 速率限制
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log('\n=====================================')
    console.log('处理完成！')
    console.log('=====================================')

  } catch (error) {
    console.error('处理失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 如果通过命令行直接运行
if (require.main === module) {
  main()
}

module.exports = { analyzeDifficulty, translateText, processVideo }
