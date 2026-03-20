const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function translateText(text, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh`
      const response = await fetch(apiUrl)
      const data = await response.json()

      if (data.responseStatus === 200) {
        return data.responseData.translatedText
      }

      // 如果达到限制，等待一段时间
      if (data.responseStatus === 403 || data.responseStatus === 429) {
        console.log('达到API限制，等待2秒...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }
    } catch (error) {
      console.error(`翻译错误 (尝试 ${i + 1}/${retries}):`, error.message)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return null // 翻译失败
}

async function addTranslations() {
  console.log('开始为字幕添加中文翻译...')

  try {
    // 获取所有英文字幕
    const subtitles = await prisma.subtitle.findMany({
      where: { language: 'EN' }
    })

    console.log(`找到 ${subtitles.length} 个英文字幕`)

    let successCount = 0
    let skipCount = 0
    let errorCount = 0

    for (let i = 0; i < subtitles.length; i++) {
      const subtitle = subtitles[i]
      const content = JSON.parse(subtitle.content)

      console.log(`\n处理字幕 ${i + 1}/${subtitles.length} (视频ID: ${subtitle.videoId})`)

      // 检查是否已有中文字幕
      const existingZh = await prisma.subtitle.findFirst({
        where: {
          videoId: subtitle.videoId,
          language: 'ZH'
        }
      })

      if (existingZh) {
        console.log('  ✓ 已存在中文字幕，跳过')
        skipCount++
        continue
      }

      // 翻译每个字幕条目
      const translatedContent = []
      let translatedInSegment = 0

      for (let j = 0; j < content.length; j++) {
        const segment = content[j]
        const englishText = segment.text || segment

        // 跳过空文本
        if (!englishText || englishText.trim() === '') {
          translatedContent.push(segment)
          continue
        }

        process.stdout.write(`  翻译进度: ${j + 1}/${content.length} (${Math.round((j + 1) / content.length * 100)}%)\r`)

        // 翻译文本
        const translated = await translateText(englishText)

        if (translated) {
          translatedContent.push({
            ...segment,
            text: translated
          })
          translatedInSegment++
        } else {
          translatedContent.push(segment)
        }

        // 添加延迟以避免API限制
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      console.log(`  ✓ 翻译完成: ${translatedInSegment}/${content.length}`)

      // 保存中文字幕
      if (translatedInSegment > 0) {
        await prisma.subtitle.create({
          data: {
            videoId: subtitle.videoId,
            language: 'ZH',
            content: JSON.stringify(translatedContent),
            filePath: subtitle.filePath ? subtitle.filePath.replace('.en.', '.zh.') : null
          }
        })
        successCount++
        console.log('  ✓ 中文字幕已保存')
      } else {
        errorCount++
        console.log('  ✗ 翻译失败')
      }
    }

    console.log('\n=====================================')
    console.log('翻译完成！')
    console.log(`成功: ${successCount}`)
    console.log(`跳过: ${skipCount}`)
    console.log(`失败: ${errorCount}`)
    console.log('=====================================')

  } catch (error) {
    console.error('添加翻译失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addTranslations()
