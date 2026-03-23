import { exec } from 'child_process'
import { promisify } from 'util'
import { randomBytes } from 'crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import * as fs from 'fs'

const execAsync = promisify(exec)

// Windows 下 ffmpeg 的完整路径
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'C:\\ffmpeg\\bin\\ffmpeg.exe'
const FFPROBE_PATH = process.env.FFPROBE_PATH || 'C:\\ffmpeg\\bin\\ffprobe.exe'

export interface VideoInfo {
  duration: number // 秒
  width?: number
  height?: number
}

/**
 * 获取视频信息（时长、分辨率等）
 * 如果 ffmpeg 不可用，返回默认值
 */
export async function getVideoInfo(filePath: string): Promise<VideoInfo> {
  try {
    // 检查 ffmpeg 是否可用（使用完整路径）
    const { stdout: ffmpegVersion } = await execAsync(`"${FFMPEG_PATH}" -version`, {
      timeout: 10000
    })

    if (!ffmpegVersion.includes('ffmpeg')) {
      console.log('ffmpeg 不可用，使用默认时长')
      return { duration: 300 } // 默认 5 分钟
    }

    // 使用 ffprobe 获取视频信息（比 ffmpeg 更快更可靠）
    const { stdout } = await execAsync(
      `"${FFPROBE_PATH}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { timeout: 30000 } // 增加超时到 30 秒
    )

    const duration = parseFloat(stdout.trim())
    if (isNaN(duration)) {
      throw new Error('无法解析视频时长')
    }

    console.log(`成功获取视频时长: ${duration} 秒`)
    return { duration }
  } catch (error: any) {
    console.log('获取视频信息失败，使用默认时长:', error.message)

    // 如果 ffmpeg/ffprobe 不可用，返回默认时长
    // 用户可以稍后在管理后台手动修改
    return { duration: 300 } // 默认 5 分钟
  }
}

/**
 * 生成视频封面缩略图
 */
export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  timestamp: number = 1 // 默认第 1 秒
): Promise<void> {
  try {
    await execAsync(
      `"${FFMPEG_PATH}" -i "${videoPath}" -ss ${timestamp} -vframes 1 -vf "scale=320:-1" "${outputPath}"`,
      { timeout: 30000 }
    )
  } catch (error) {
    console.error('生成封面失败:', error)
    throw new Error('生成封面失败')
  }
}

/**
 * 验证视频文件格式
 */
export function isValidVideoFile(filename: string): boolean {
  const validExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv']
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return validExtensions.includes(ext)
}

/**
 * 验证字幕文件格式
 */
export function isValidSubtitleFile(filename: string): boolean {
  const validExtensions = ['.srt', '.vtt']
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return validExtensions.includes(ext)
}

// R2 配置
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

/**
 * 上传封面到 R2 存储
 */
async function uploadCoverToR2(buffer: Buffer, fileName: string): Promise<{ url: string | null; error?: string }> {
  if (!r2Client) {
    return { url: null, error: 'R2 未配置' }
  }

  try {
    const key = `covers/${fileName}`
    const command = new PutObjectCommand({
      Bucket: r2BucketName,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
    })

    await r2Client.send(command)
    return { url: key }
  } catch (error: any) {
    console.error('[COVER] R2 上传失败:', error)
    return { url: null, error: error.message }
  }
}

/**
 * 从视频自动提取并上传封面
 * @param videoUrl 视频 URL（可以是相对路径或完整 URL）
 * @returns 封面 URL 或 null
 */
export async function extractAndUploadCover(videoUrl: string): Promise<string | null> {
  try {
    console.log('[COVER] 开始自动提取封面:', videoUrl)

    // 获取完整的视频URL（如果是相对路径）
    let fullVideoUrl = videoUrl
    if (videoUrl.startsWith('/api/video-proxy/')) {
      const host = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      fullVideoUrl = `${host}${videoUrl}`
    } else if (videoUrl.startsWith('/')) {
      const host = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      fullVideoUrl = `${host}${videoUrl}`
    } else if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
      const host = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      fullVideoUrl = `${host}/api/video-proxy/${videoUrl}`
    }

    console.log('[COVER] 完整视频URL:', fullVideoUrl)

    // 生成临时文件名
    const tempId = randomBytes(8).toString('hex')
    const tempDir = 'C:\\Users\\DanDan\\english-learning-platform\\public\\uploads\\temp'

    // 确保临时目录存在
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const tempCoverPath = `${tempDir}\\cover-${tempId}.jpg`

    // 使用 ffmpeg 截取视频首帧
    const ffmpegCmd = `"${FFMPEG_PATH}" -y -ss 0 -i "${fullVideoUrl}" -vframes 1 -q:v 2 "${tempCoverPath}"`

    console.log('[COVER] 执行命令:', ffmpegCmd)

    await execAsync(ffmpegCmd, { timeout: 60000 })

    // 检查文件是否生成成功
    if (!fs.existsSync(tempCoverPath)) {
      console.error('[COVER] 封面文件生成失败')
      return null
    }

    console.log('[COVER] 封面文件已生成:', tempCoverPath)

    // 读取文件
    const coverBuffer = fs.readFileSync(tempCoverPath)
    const coverFileName = `cover-${Date.now()}-${tempId}.jpg`

    // 删除临时文件
    try {
      fs.unlinkSync(tempCoverPath)
      console.log('[COVER] 临时文件已删除')
    } catch (e) {
      console.warn('[COVER] 删除临时文件失败:', e)
    }

    // 上传到云端存储
    console.log('[COVER] 开始上传封面到云端...')
    const uploadResult = await uploadCoverToR2(coverBuffer, coverFileName)

    if (uploadResult.error || !uploadResult.url) {
      console.error('[COVER] 封面上传失败:', uploadResult.error)
      return null
    }

    console.log('[COVER] 封面自动生成成功:', uploadResult.url)
    return uploadResult.url
  } catch (error: any) {
    console.error('[COVER] 自动生成封面失败:', error?.message || error)
    return null
  }
}
