import { prisma } from './lib/prisma'

async function checkSubtitles() {
  const videos = await prisma.video.findMany({
    include: {
      subtitles: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5
  })

  console.log('\n=== 最近5个视频的字幕情况 ===\n')

  for (const video of videos) {
    console.log(`视频ID: ${video.id}`)
    console.log(`标题: ${video.title}`)
    console.log(`字幕数量: ${video.subtitles.length}`)

    if (video.subtitles.length > 0) {
      video.subtitles.forEach(sub => {
        console.log(`  - 语言: ${sub.language}`)
        console.log(`    文件: ${sub.filePath}`)

        // 检查content的前100个字符
        if (sub.content) {
          try {
            const content = JSON.parse(sub.content)
            console.log(`    字幕条数: ${content.length}`)
            if (content.length > 0) {
              const firstSub = content[0]
              console.log(`    第一条字幕开始: ${firstSub.startTime}ms`)
              console.log(`    第一条字幕文本: ${firstSub.text?.substring(0, 50)}...`)
            }
          } catch (e) {
            console.log(`    Content解析失败，长度: ${sub.content.length} 字符`)
          }
        }
      })
    } else {
      console.log('  暂无字幕')
    }
    console.log('')
  }

  await prisma.$disconnect()
}

checkSubtitles().catch(console.error)
