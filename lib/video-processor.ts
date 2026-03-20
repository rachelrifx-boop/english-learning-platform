import { exec } from 'child_process'
import { promisify } from 'util'

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
