export interface SubtitleSegment {
  id: number
  startTime: number // 毫秒
  endTime: number
  text: string
}

/**
 * 解析 SRT 时间戳格式: 00:00:01,000 --> 00:00:04,000
 */
function parseSRTTime(timeString: string): number {
  const [time, milliseconds] = timeString.split(',')
  const [hours, minutes, seconds] = time.split(':').map(Number)
  return hours * 3600000 + minutes * 60000 + seconds * 1000 + parseInt(milliseconds)
}

/**
 * 解析 VTT 时间戳格式: 00:00:01.000 --> 00:00:04.000
 */
function parseVTTTime(timeString: string): number {
  const parts = timeString.split(':')
  if (parts.length === 3) {
    const [hours, minutes, rest] = parts
    const [seconds, milliseconds] = rest.split('.')
    return parseInt(hours) * 3600000 + parseInt(minutes) * 60000 + parseInt(seconds) * 1000 + parseInt(milliseconds || '0')
  }
  // WebVTT 可以没有小时部分: 00:01.000
  const [minutes, rest] = parts
  const [seconds, milliseconds] = rest.split('.')
  return parseInt(minutes) * 60000 + parseInt(seconds) * 1000 + parseInt(milliseconds || '0')
}

/**
 * 解析 SRT 字幕文件
 */
export function parseSRT(content: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = []

  // 标准化换行符，将 \r\n 转换为 \n
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // 使用正则表达式分割字幕块（匹配双换行符）
  const blocks = normalizedContent.trim().split(/\n\s*\n/)

  blocks.forEach((block, index) => {
    const lines = block.split('\n').filter(line => line.trim() !== '')
    if (lines.length < 3) return

    const id = parseInt(lines[0])
    const timeLine = lines[1]
    const textLines = lines.slice(2)

    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/)
    if (!timeMatch) return

    const startTime = parseSRTTime(timeMatch[1])
    const endTime = parseSRTTime(timeMatch[2])
    const text = textLines.join('\n').replace(/<[^>]+>/g, '') // 移除 HTML 标签

    segments.push({ id, startTime, endTime, text })
  })

  return segments
}

/**
 * 解析 VTT 字幕文件
 */
export function parseVTT(content: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = []
  // 移除 WEBVTT 头
  const cleanContent = content.replace(/WEBVTT\n/, '').replace(/_KIND:\s*\w+\n/g, '')
  const blocks = cleanContent.trim().split(/\n\n+/)

  blocks.forEach((block, index) => {
    const lines = block.split('\n')
    if (lines.length < 2) return

    let timeLineIndex = 0
    // 找到时间戳行（跳过可能的 ID 行）
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIndex = i
        break
      }
    }

    const id = index + 1
    const timeLine = lines[timeLineIndex]
    const textLines = lines.slice(timeLineIndex + 1)

    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/) ||
                     timeLine.match(/(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}\.\d{3})/)

    if (!timeMatch) return

    const startTime = parseVTTTime(timeMatch[1])
    const endTime = parseVTTTime(timeMatch[2])
    const text = textLines.join('\n').replace(/<[^>]+>/g, '')

    segments.push({ id, startTime, endTime, text })
  })

  return segments
}

/**
 * 自动检测并解析字幕文件
 */
export function parseSubtitle(content: string, filename: string): SubtitleSegment[] {
  const trimmed = content.trim()

  if (trimmed.startsWith('WEBVTT')) {
    return parseVTT(trimmed)
  }

  // 默认按 SRT 解析
  return parseSRT(trimmed)
}

/**
 * 合并中英文字幕
 */
export function mergeSubtitles(
  englishSubs: SubtitleSegment[],
  chineseSubs: SubtitleSegment[]
): Array<{
  id: number
  startTime: number
  endTime: number
  text: { en: string; zh: string }
}> {
  const merged: Array<{
    id: number
    startTime: number
    endTime: number
    text: { en: string; zh: string }
  }> = []

  // 简单合并策略：基于时间戳匹配
  const allTimestamps = new Set<number>()
  englishSubs.forEach(sub => allTimestamps.add(sub.startTime))
  chineseSubs.forEach(sub => allTimestamps.add(sub.startTime))

  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)

  sortedTimestamps.forEach((timestamp, index) => {
    const enSub = englishSubs.find(sub => Math.abs(sub.startTime - timestamp) < 100)
    const zhSub = chineseSubs.find(sub => Math.abs(sub.startTime - timestamp) < 100)

    if (enSub || zhSub) {
      merged.push({
        id: index + 1,
        startTime: timestamp,
        endTime: Math.max(
          enSub?.endTime || timestamp,
          zhSub?.endTime || timestamp
        ),
        text: {
          en: enSub?.text || '',
          zh: zhSub?.text || ''
        }
      })
    }
  })

  return merged
}
