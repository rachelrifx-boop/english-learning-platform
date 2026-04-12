/**
 * 视频转码模块
 * 自动将非H.264编码的视频转换为浏览器兼容的H.264格式
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, createReadStream } from 'fs'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import path from 'path'

const execAsync = promisify(exec)

const FFMPEG_PATH = process.env.FFMPEG_PATH || 'C:\\ffmpeg\\bin\\ffmpeg.exe'
const FFPROBE_PATH = process.env.FFPROBE_PATH || 'C:\\ffmpeg\\bin\\ffprobe.exe'

const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos'

// 创建 R2 客户端
let r2Client: S3Client | null = null
if (r2AccountId && r2AccessKeyId && r2SecretAccessKey) {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  })
}

export interface TranscodeResult {
  success: boolean
  originalCodec?: string
  newFilePath?: string
  message?: string
  error?: string
}

/**
 * 检测视频编码格式
 */
export async function detectVideoCodec(filePath: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `"${FFPROBE_PATH}" -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { timeout: 30000 }
    )
    return stdout.trim().toLowerCase()
  } catch (error) {
    console.error('[TRANSCODE] 检测编码失败:', error)
    return null
  }
}

/**
 * 检查是否是浏览器兼容的编码
 */
export function isBrowserCompatible(codec: string): boolean {
  const compatibleCodecs = ['h264', 'avc', 'vp8', 'vp9', 'av1', 'mpeg4']
  return compatibleCodecs.includes(codec.toLowerCase())
}

/**
 * 从R2下载视频
 */
async function downloadVideoFromR2(videoKey: string, outputPath: string): Promise<boolean> {
  if (!r2Client) {
    console.error('[TRANSCODE] R2 未配置')
    return false
  }

  try {
    console.log('[TRANSCODE] 从R2下载视频:', videoKey)

    const command = new GetObjectCommand({
      Bucket: r2BucketName,
      Key: videoKey,
    })

    const response = await r2Client.send(command)
    const body = response.Body

    if (!body) {
      console.error('[TRANSCODE] 视频不存在:', videoKey)
      return false
    }

    // 确保目录存在
    const dir = path.dirname(outputPath)
    await mkdir(dir, { recursive: true })

    // 下载到本地
    const chunks: Buffer[] = []
    for await (const chunk of body as any) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    await writeFile(outputPath, buffer)

    console.log('[TRANSCODE] 下载完成:', outputPath, `(${(buffer.length / 1024 / 1024).toFixed(2)}MB)`)
    return true
  } catch (error: any) {
    console.error('[TRANSCODE] 下载失败:', error.message)
    return false
  }
}

/**
 * 上传视频到R2
 */
async function uploadVideoToR2(filePath: string, key: string): Promise<boolean> {
  if (!r2Client) {
    console.error('[TRANSCODE] R2 未配置')
    return false
  }

  try {
    console.log('[TRANSCODE] 上传转码后的视频到R2:', key)

    const { readFile } = await import('fs/promises')
    const fileBuffer = await readFile(filePath)

    const command = new PutObjectCommand({
      Bucket: r2BucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: 'video/mp4',
    })

    await r2Client.send(command)
    console.log('[TRANSCODE] 上传完成:', key)
    return true
  } catch (error: any) {
    console.error('[TRANSCODE] 上传失败:', error.message)
    return false
  }
}

/**
 * 转换视频为H.264格式
 */
async function transcodeToH264(inputPath: string, outputPath: string): Promise<boolean> {
  try {
    console.log('[TRANSCODE] 开始转码为H.264...')
    console.log('[TRANSCODE] 输入:', inputPath)
    console.log('[TRANSCODE] 输出:', outputPath)

    const cmd = `"${FFMPEG_PATH}" -i "${inputPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart -y "${outputPath}"`

    console.log('[TRANSCODE] 执行命令:', cmd)

    const { stdout, stderr } = await execAsync(cmd, {
      timeout: 600000, // 10分钟超时
      maxBuffer: 10 * 1024 * 1024 // 10MB输出缓冲区
    })

    // 检查输出文件是否存在
    if (existsSync(outputPath)) {
      const stats = await import('fs/promises').then(m => m.stat(outputPath))
      console.log('[TRANSCODE] 转码成功! 大小:', (stats.size / 1024 / 1024).toFixed(2), 'MB')
      return true
    } else {
      console.error('[TRANSCODE] 转码失败: 输出文件不存在')
      return false
    }
  } catch (error: any) {
    console.error('[TRANSCODE] 转码失败:', error.message)
    console.error('[TRANSCODE] 错误详情:', error.stderr || '无')
    return false
  }
}

/**
 * 自动转码视频（如果不是H.264格式）
 * @param videoKey R2中的视频路径（如：videos/xxx.mp4）
 * @returns 转码结果
 */
export async function autoTranscodeVideo(videoKey: string): Promise<TranscodeResult> {
  const tempDir = path.join(process.cwd(), 'public', 'uploads', 'temp')
  const tempId = Date.now().toString()
  const inputPath = path.join(tempDir, `input-${tempId}.mp4`)
  const outputPath = path.join(tempDir, `output-${tempId}.mp4`)

  try {
    // 1. 从R2下载视频
    const downloaded = await downloadVideoFromR2(videoKey, inputPath)
    if (!downloaded) {
      return { success: false, error: '下载视频失败' }
    }

    // 2. 检测编码格式
    const codec = await detectVideoCodec(inputPath)
    if (!codec) {
      // 清理临时文件
      await cleanup(inputPath, outputPath)
      return { success: false, error: '无法检测视频编码' }
    }

    console.log('[TRANSCODE] 检测到编码格式:', codec)

    // 3. 检查是否已是H.264
    if (isBrowserCompatible(codec)) {
      console.log('[TRANSCODE] 视频已是浏览器兼容格式，无需转码')
      await cleanup(inputPath, outputPath)
      return {
        success: true,
        originalCodec: codec,
        message: '视频格式已兼容，无需转码'
      }
    }

    // 4. 转码为H.264
    console.log('[TRANSCODE] 检测到非兼容格式:', codec, '开始转码...')
    const transcoded = await transcodeToH264(inputPath, outputPath)

    if (!transcoded) {
      await cleanup(inputPath, outputPath)
      return { success: false, error: '转码失败' }
    }

    // 5. 上传转码后的视频
    const uploaded = await uploadVideoToR2(outputPath, videoKey)
    if (!uploaded) {
      await cleanup(inputPath, outputPath)
      return { success: false, error: '上传转码视频失败' }
    }

    // 6. 清理临时文件
    await cleanup(inputPath, outputPath)

    return {
      success: true,
      originalCodec: codec,
      newFilePath: videoKey,
      message: `成功转码为H.264格式（原格式: ${codec}）`
    }

  } catch (error: any) {
    console.error('[TRANSCODE] 处理失败:', error)
    await cleanup(inputPath, outputPath)
    return { success: false, error: error.message }
  }
}

/**
 * 清理临时文件
 */
async function cleanup(inputPath: string, outputPath: string) {
  try {
    if (existsSync(inputPath)) await unlink(inputPath)
    if (existsSync(outputPath)) await unlink(outputPath)
    console.log('[TRANSCODE] 临时文件已清理')
  } catch (e) {
    console.warn('[TRANSCODE] 清理临时文件失败:', e)
  }
}
