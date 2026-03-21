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
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log('First entry:', JSON.stringify(parsed[0], null, 2))
      }
    } catch (e) {
      console.log('Failed to parse content:', (e as Error).message)
      console.log('First 200 chars:', s.content.substring(0, 200))
    }
  })
}

checkSubtitles().then(() => process.exit(0))
