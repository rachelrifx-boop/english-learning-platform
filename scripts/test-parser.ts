import { readFile } from 'fs/promises'
import { parseSubtitle, mergeSubtitles } from '../lib/subtitle-parser'

async function testParser() {
  const enContent = await readFile('C:/Users/DanDan/english-learning-platform/public/uploads/subtitles/whisper-cmmulzox00004rt6kzgfbd7zv-en.srt', 'utf-8')
  const zhContent = await readFile('C:/Users/DanDan/english-learning-platform/public/uploads/subtitles/whisper-cmmulzox00004rt6kzgfbd7zv-zh.srt', 'utf-8')

  console.log('EN content length:', enContent.length)
  console.log('ZH content length:', zhContent.length)

  console.log('\nFirst 200 chars of EN:', enContent.substring(0, 200))

  const englishSegments = parseSubtitle(enContent, 'whisper.srt')
  const chineseSegments = parseSubtitle(zhContent, 'whisper-zh.srt')

  console.log('\nEnglish segments count:', englishSegments.length)
  console.log('Chinese segments count:', chineseSegments.length)

  if (englishSegments.length > 0) {
    console.log('\nFirst English segment:', JSON.stringify(englishSegments[0], null, 2))
  }

  const merged = mergeSubtitles(englishSegments, chineseSegments)
  console.log('\nMerged segments count:', merged.length)

  if (merged.length > 0) {
    console.log('\nFirst merged segment:', JSON.stringify(merged[0], null, 2))
  }

  console.log('\nStringified merged:', JSON.stringify(merged).substring(0, 500))
}

testParser().then(() => process.exit(0))
