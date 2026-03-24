import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, readFile } from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

/**
 * 从视频中提取音频
 * 返回音频文件路径
 */
export async function extractAudio(videoPath: string): Promise<string> {
  try {
    const outputDir = path.join(process.cwd(), 'public', 'uploads', 'temp')
    const audioFilename = `audio-${Date.now()}.mp3`
    const audioPath = path.join(outputDir, audioFilename)

    // 使用 ffmpeg 提取音频（指定完整路径）
    const ffmpegPath = 'C:\\ffmpeg\\bin\\ffmpeg.exe'
    const command = `"${ffmpegPath}" -i "${videoPath}" -vn -acodec libmp3lame -q:a 2 -y "${audioPath}"`
    await execAsync(command, { timeout: 60000 })

    return audioPath
  } catch (error) {
    console.error('提取音频失败:', error)
    throw new Error('提取音频失败')
  }
}

/**
 * 删除临时音频文件
 */
export async function cleanupAudio(audioPath: string): Promise<void> {
  try {
    await unlink(audioPath)
  } catch (error) {
    console.log('清理音频文件失败:', error)
  }
}

/**
 * 使用 OpenAI Whisper API 生成字幕
 */
export async function generateSubtitlesWithWhisper(
  audioPath: string,
  apiKey: string
): Promise<string> {
  try {
    const formData = new FormData()
    formData.append('file', new Blob([await readFile(audioPath)]), 'audio.mp3')
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'srt')
    formData.append('language', 'en')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Whisper API 调用失败')
    }

    const srtContent = await response.text()
    return srtContent
  } catch (error) {
    console.error('Whisper API 调用失败:', error)
    throw error
  }
}

/**
 * 使用 Google Cloud Speech-to-Text API 生成字幕
 */
export async function generateSubtitlesWithGoogleCloud(
  audioPath: string,
  credentials: string
): Promise<string> {
  try {
    // 导入 Google Cloud Speech-to-Text 客户端
    const speech = require('@google-cloud/speech')

    // 解析服务账号凭据（JSON格式）
    let serviceAccountKey
    try {
      // 如果输入是 JSON 文件路径
      if (credentials.endsWith('.json')) {
        const fs = require('fs')
        const keyContent = fs.readFileSync(credentials, 'utf-8')
        serviceAccountKey = JSON.parse(keyContent)
      } else {
        // 如果输入是直接的 JSON 字符串
        serviceAccountKey = JSON.parse(credentials)
      }
    } catch (e) {
      throw new Error('无效的 Google Cloud 凭据格式。请提供服务账号 JSON 文件路径或 JSON 字符串。')
    }

    // 创建客户端，使用服务账号凭据
    const client = new speech.SpeechClient({
      credentials: serviceAccountKey,
      projectId: serviceAccountKey.project_id
    })

    // 读取音频文件
    const audioBytes = await readFile(audioPath)
    const audioContent = audioBytes.toString('base64')

    const config = {
      encoding: 'MP3' as const,
      sampleRateHertz: 44100,
      languageCode: 'en-US',
      enableWordTimeOffsets: true,
      enableAutomaticPunctuation: true
    }

    const request = {
      audio: { content: audioContent },
      config: config
    }

    console.log('开始调用 Google Cloud Speech-to-Text API (异步模式)...')

    // 使用 longRunningRecognize 处理长音频
    const [operation] = await client.longRunningRecognize(request)
    console.log('等待 Google Cloud API 处理中...（这可能需要几分钟）')

    // 等待操作完成
    const [response] = await operation.promise()
    console.log('Google Cloud API 调用完成')

    // 将响应转换为 SRT 格式
    const transcription = response.results
      .map((result: any) => result.alternatives[0].transcript)
      .join('\n')

    // 由于 Google Cloud 返回的是整个文本，我们需要根据时间戳生成 SRT
    return convertToSRT(response.results)
  } catch (error) {
    console.error('Google Cloud Speech-to-Text 调用失败:', error)
    throw new Error('Google Cloud Speech-to-Text 调用失败: ' + (error as any).message)
  }
}

/**
 * 将 Google Cloud Speech-to-Text 响应转换为 SRT 格式
 */
function convertToSRT(results: any[]): string {
  let srtContent = ''
  let subtitleIndex = 1
  let startTime = 0
  let endTime = 0
  let currentText = ''

  results.forEach((result: any, resultIndex: number) => {
    const alternative = result.alternatives[0]
    const words = alternative.words

    if (words && words.length > 0) {
      // 按句子分组（每个句子约3-5秒）
      let sentenceStart = words[0].startTime.seconds + words[0].startTime.nanos / 1e9
      let sentenceText = ''
      let wordCount = 0

      for (let i = 0; i < words.length; i++) {
        const word = words[i]
        sentenceText += word.word + ' '
        wordCount++

        // 每5-8个单词或遇到标点符号，创建一个字幕块
        if (wordCount >= 6 || i === words.length - 1 || /[.!?]/.test(word.word)) {
          const sentenceEnd = word.endTime.seconds + word.endTime.nanos / 1e9

          srtContent += `${subtitleIndex}\n`
          srtContent += `${formatSRTTime(sentenceStart)} --> ${formatSRTTime(sentenceEnd)}\n`
          srtContent += `${sentenceText.trim()}\n\n`

          subtitleIndex++
          sentenceStart = i + 1 < words.length
            ? words[i + 1].startTime.seconds + words[i + 1].startTime.nanos / 1e9
            : sentenceEnd
          sentenceText = ''
          wordCount = 0
        }
      }
    } else {
      // 如果没有单词级别的时间戳，使用整个结果
      const text = alternative.transcript.trim()
      if (text) {
        srtContent += `${subtitleIndex}\n`
        srtContent += `00:00:00,000 --> 00:00:05,000\n` // 默认5秒
        srtContent += `${text}\n\n`
        subtitleIndex++
      }
    }
  })

  return srtContent
}

/**
 * 格式化时间为 SRT 格式 (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const millis = Math.floor((seconds % 1) * 1000)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`
}

/**
 * 翻译字幕内容（使用百度翻译 API）- 优化版，支持批量翻译和并行请求
 * apiKey 格式: "APP_ID,SECRET_KEY"
 */
export async function translateSubtitleContent(
  englishContent: string,
  apiKey: string
): Promise<string> {
  try {
    // 解析 API Key
    const [appId, secretKey] = apiKey.split(',').map(k => k.trim())

    if (!appId || !secretKey) {
      throw new Error('百度翻译 API Key 格式错误，应为：APP_ID,SECRET_KEY')
    }

    console.log('开始翻译（优化版），使用APP_ID:', appId)

    // 解析 SRT 格式
    const segments = parseSRT(englishContent)
    console.log('需要翻译的片段数:', segments.length)

    // 将片段分组，每组最多 2000 字符（百度 API 限制）
    const BATCH_SIZE = 2000
    const batches: Array<{ segments: typeof segments, startIndex: number }> = []
    let currentBatch: typeof segments = []
    let currentLength = 0
    let currentIndex = 0

    for (const segment of segments) {
      const segmentLength = segment.text.length

      // 如果单个片段就超过限制，需要单独处理
      if (segmentLength > BATCH_SIZE) {
        if (currentBatch.length > 0) {
          batches.push({ segments: currentBatch, startIndex: currentIndex - currentBatch.length })
          currentBatch = []
          currentLength = 0
        }
        // 单独处理这个大片段
        batches.push({ segments: [segment], startIndex: currentIndex })
        currentIndex++
        continue
      }

      // 如果添加这个片段会超过限制，先保存当前批次
      if (currentLength + segmentLength > BATCH_SIZE && currentBatch.length > 0) {
        batches.push({ segments: currentBatch, startIndex: currentIndex - currentBatch.length })
        currentBatch = []
        currentLength = 0
      }

      currentBatch.push(segment)
      currentLength += segmentLength
      currentIndex++
    }

    // 保存最后一个批次
    if (currentBatch.length > 0) {
      batches.push({ segments: currentBatch, startIndex: currentIndex - currentBatch.length })
    }

    console.log('分成', batches.length, '个批次进行翻译')

    // 并行处理批次（最多 5 个并发）
    const CONCURRENCY = 5
    const results: Array<typeof segments> = []
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < batches.length; i += CONCURRENCY) {
      const batchGroup = batches.slice(i, i + CONCURRENCY)
      const groupResults = await Promise.all(
        batchGroup.map(async ({ segments: batchSegments, startIndex }) => {
          const batchResults = []
          for (const segment of batchSegments) {
            try {
              // 合并批次中所有文本
              const query = batchSegments.map(s => s.text).join('\n')

              // 生成签名
              const salt = Date.now().toString()
              const sign = generateBaiduSign(appId, query, salt, secretKey)

              // 调用百度翻译 API
              const apiUrl = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(query)}&from=en&to=zh&appid=${appId}&salt=${salt}&sign=${sign}`

              const response = await fetch(apiUrl, {
                signal: AbortSignal.timeout(30000)
              })

              const data = await response.json()

              if (data.trans_result && data.trans_result.length > 0) {
                // 分配翻译结果到各个片段
                for (let j = 0; j < batchSegments.length; j++) {
                  batchResults.push({
                    ...batchSegments[j],
                    text: data.trans_result[j]?.dst || batchSegments[j].text
                  })
                  successCount++
                }
                console.log('批次翻译成功:', startIndex + 1, '-', startIndex + batchSegments.length)
              } else {
                // 翻译失败，保留原文
                for (const seg of batchSegments) {
                  batchResults.push(seg)
                  failCount++
                }
                console.log('批次翻译失败，保留原文:', startIndex)
              }

              // 只需要处理一次整个批次
              break
            } catch (error) {
              // 批次失败，逐个片段重试
              for (const segment of batchSegments) {
                try {
                  const salt = Date.now().toString()
                  const query = segment.text
                  const sign = generateBaiduSign(appId, query, salt, secretKey)

                  const apiUrl = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(query)}&from=en&to=zh&appid=${appId}&salt=${salt}&sign=${sign}`

                  const response = await fetch(apiUrl, {
                    signal: AbortSignal.timeout(10000)
                  })

                  const data = await response.json()

                  if (data.trans_result && data.trans_result[0]) {
                    batchResults.push({
                      ...segment,
                      text: data.trans_result[0].dst
                    })
                    successCount++
                  } else {
                    batchResults.push(segment)
                    failCount++
                  }
                } catch (e) {
                  batchResults.push(segment)
                  failCount++
                }
              }
            }
          }
          return batchResults
        })
      )

      results.push(...groupResults.flat())
    }

    console.log('翻译完成，成功:', successCount, '失败:', failCount, '总计:', segments.length)

    // 生成中文 SRT
    return generateSRT(results)
  } catch (error) {
    console.error('翻译字幕失败:', error)
    throw error
  }
}

/**
 * 生成百度翻译 API 签名
 */
function generateBaiduSign(appId: string, query: string, salt: string, secretKey: string): string {
  const crypto = require('crypto')
  const str = appId + query + salt + secretKey
  return crypto.createHash('md5').update(str).digest('hex')
}

/**
 * 解析 SRT 格式
 */
function parseSRT(srtContent: string): Array<{
  index: number
  startTime: string
  endTime: string
  text: string
}> {
  // 标准化换行符，将 Windows \r\n 转换为 Unix \n
  const normalizedContent = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // 使用正则表达式分割字幕块
  const blocks = normalizedContent.trim().split(/\n\s*\n/)

  return blocks.map(block => {
    const lines = block.split('\n').filter(line => line.trim() !== '')
    if (lines.length < 3) return null

    const index = parseInt(lines[0])
    const timecode = lines[1]
    const text = lines.slice(2).join('\n')

    return { index, startTime: timecode.split(' --> ')[0], endTime: timecode.split(' --> ')[1], text }
  }).filter(block => block !== null) as Array<{
    index: number
    startTime: string
    endTime: string
    text: string
  }>
}

/**
 * 生成 SRT 格式
 */
function generateSRT(segments: Array<{
  index: number
  startTime: string
  endTime: string
  text: string
}>): string {
  return segments.map(segment => {
    return `${segment.index}\n${segment.startTime} --> ${segment.endTime}\n${segment.text}`
  }).join('\n\n')
}

/**
 * SRT 时间格式转换为毫秒
 */
export function srtTimeToMillis(timeStr: string): number {
  const [time, ms] = timeStr.split(',')
  const [hours, minutes, seconds] = time.split(':').map(Number)
  return hours * 3600000 + minutes * 60000 + seconds * 1000 + parseInt(ms)
}

/**
 * 毫秒转换为 SRT 时间格式
 */
export function millisToSrtTime(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const milliseconds = ms % 1000

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`
}
