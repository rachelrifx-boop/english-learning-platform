import { prisma } from '../lib/prisma'

async function checkSubtitles() {
  const video = await prisma.video.findUnique({
    where: { id: 'cmmulzox00004rt6kzgfbd7zv' },
    include: { subtitles: true }
  })

  if (!video) {
    console.log('Video not found')
    return
  }

  console.log('Video:', video.title)
  console.log('Subtitles count:', video.subtitles.length)

  video.subtitles.forEach(s => {
    console.log('\n--- Subtitle ---')
    console.log('Language:', s.language)
    console.log('Content length:', s.content.length)

    try {
      const parsed = JSON.parse(s.content)
      console.log('Parsed content type:', Array.isArray(parsed) ? 'array' : typeof parsed)
      console.log('Number of segments:', parsed.length)

      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log('\nFirst 3 segments:')
        parsed.slice(0, 3).forEach((seg, i) => {
          console.log(`\n${i + 1}. ID: ${seg.id}`)
          console.log(`   Start: ${seg.startTime}ms`)
          console.log(`   End: ${seg.endTime}ms`)
          if (typeof seg.text === 'string') {
            console.log(`   Text: "${seg.text.substring(0, 50)}..."`)
          } else if (typeof seg.text === 'object' && seg.text) {
            console.log(`   Text.en: "${seg.text.en?.substring(0, 50)}..."`)
            console.log(`   Text.zh: "${seg.text.zh?.substring(0, 50)}..."`)
          }
        })

        console.log('\nLast segment:')
        const last = parsed[parsed.length - 1]
        console.log(`ID: ${last.id}`)
        console.log(`Start: ${last.startTime}ms`)
        console.log(`End: ${last.endTime}ms`)
        if (typeof last.text === 'string') {
          console.log(`Text: "${last.text.substring(0, 50)}..."`)
        } else if (typeof last.text === 'object' && last.text) {
          console.log(`Text.en: "${last.text.en?.substring(0, 50)}..."`)
          console.log(`Text.zh: "${last.text.zh?.substring(0, 50)}..."`)
        }
      }
    } catch (e) {
      console.log('Failed to parse content:', e.message)
      console.log('First 200 chars:', s.content.substring(0, 200))
    }
  })
}

checkSubtitles().then(() => process.exit(0))
