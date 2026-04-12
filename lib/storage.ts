import { uploadToR2 } from './r2-upload'
import { uploadFileWithProgress } from './supabase-upload'

export interface UploadResult {
  url: string
  key?: string
  path?: string
  error?: string
  duration?: number
}

/**
 * 统一的上传接口
 * 智能选择上传方式：
 * 1. 小文件（<4.5MB）：服务器端直接上传到 R2
 * 2. 大文件（>=4.5MB）：使用预签名 URL 客户端直接上传
 *
 * @param file 文件对象
 * @param folder 文件夹路径
 * @param onProgress 上传进度回调
 * @returns 上传结果
 */
// 从本地视频文件获取时长（客户端）
function getVideoDurationFromFile(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      console.log('[Storage] 客户端获取视频时长:', video.duration, '秒')
      resolve(Math.round(video.duration))
    }

    video.onerror = () => {
      console.warn('[Storage] 客户端获取视频时长失败')
      resolve(null)
    }

    // 设置超时
    setTimeout(() => {
      URL.revokeObjectURL(video.src)
      resolve(null)
    }, 30000)

    video.src = URL.createObjectURL(file)
  })
}

export async function uploadFile(
  file: File,
  folder: string = 'videos',
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  console.log('[Storage] 开始上传文件:', file.name, '大小:', (file.size / 1024 / 1024).toFixed(2), 'MB')

  // 对于视频文件，先在客户端获取时长
  let clientDuration: number | null = null
  if (file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
    console.log('[Storage] 视频文件，先在客户端获取时长...')
    clientDuration = await getVideoDurationFromFile(file)
  }

  // 使用服务器端上传 API（会根据文件大小自动选择方式）
  try {
    console.log('[Storage] 使用服务器端上传 API')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'english-learning-videos')
    formData.append('folder', folder)

    const xhr = new XMLHttpRequest()

    const uploadPromise = new Promise<any>((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100)
          onProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText)
            console.log('[Storage] 服务器响应:', response)
            if (response.success) {
              // 检查是否需要客户端直接上传
              if (response.data.useDirectUpload && response.data.presignedUrl) {
                console.log('[Storage] 需要客户端直接上传到预签名 URL')
                // 使用预签名 URL 客户端直接上传
                resolve({ usePresignedUrl: true, presignedUrl: response.data.presignedUrl, key: response.data.key, url: response.data.url, duration: response.data.duration })
              } else {
                console.log('[Storage] 服务器端上传成功')
                resolve({
                  url: response.data.url || response.data.path,
                  key: response.data.path || response.data.url,
                  duration: response.data.duration
                })
              }
            } else {
              reject(new Error(response.error || '上传失败'))
            }
          } catch (e) {
            reject(new Error('解析响应失败'))
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => {
        console.warn('[Storage] 服务器端上传失败，尝试直接上传到 R2')
        reject(new Error('网络错误'))
      })

      xhr.open('POST', '/api/storage/upload')
      xhr.send(formData)
    })

    const result = await uploadPromise

    // 如果返回预签名 URL，使用客户端直接上传
    if (result.usePresignedUrl) {
      console.log('[Storage] 使用预签名 URL 客户端直接上传')
      const uploadResult = await uploadToPresignedUrl(result.presignedUrl, file, onProgress)
      // 使用客户端获取的时长（如果是视频文件）
      if (clientDuration) {
        uploadResult.duration = clientDuration
      }
      return uploadResult
    }

    return {
      url: result.url,
      key: result.key,
      duration: result.duration || clientDuration
    }
  } catch (serverUploadError) {
    console.warn('[Storage] 服务器端上传失败，尝试 R2 直接上传:', serverUploadError)

    // 降级到 R2 直接上传
    try {
      const result = await uploadToR2(file, folder, onProgress)
      if (result.error) {
        throw new Error(result.error)
      }
      return {
        url: result.url,
        key: result.key,
        duration: clientDuration || undefined
      }
    } catch (r2Error) {
      // 如果 R2 也失败，尝试 Supabase（仅小文件）
      const hasSupabaseConfig = !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )

      if (hasSupabaseConfig && file.size < 5 * 1024 * 1024) {
        console.log('[Storage] R2 上传失败，尝试使用 Supabase Storage（小文件）')
        const result = await uploadFileWithProgress(file, 'videos', folder)
        return {
          url: result.url,
          path: result.path,
          error: result.error,
        }
      }

      return {
        url: '',
        key: '',
        error: r2Error instanceof Error ? r2Error.message : '上传失败'
      }
    }
  }
}

/**
 * 使用预签名 URL 客户端直接上传
 */
async function uploadToPresignedUrl(
  presignedUrl: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  console.log('[Storage] 使用预签名 URL 上传:', presignedUrl.substring(0, 100))

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = Math.round((e.loaded / e.total) * 100)
        onProgress(progress)
      }
    })

    xhr.addEventListener('load', () => {
      console.log('[Storage] 预签名 URL 上传响应:', xhr.status)
      if (xhr.status === 200) {
        console.log('[Storage] 上传成功')
        // 从预签名 URL 中提取 key
        // R2 预签名 URL 格式: https://xxx.r2.cloudflarestorage.com/bucket/folder/file.mp4?...
        // 需要提取 bucket 之后的部分
        const urlObj = new URL(presignedUrl)
        const pathParts = urlObj.pathname.split('/')
        // 跳过开头的空字符串，保留 folder/file
        // 例如: /english-learning-videos/videos/xxx.mp4 -> english-learning-videos/videos/xxx.mp4
        // 但实际上 R2 的路径是 /bucket-name/videos/xxx.mp4
        // 我们需要跳过 bucket name，保留 videos/xxx.mp4
        // 实际预签名 URL 格式: https://bucket.accountId.r2.cloudflarestorage.com/key
        // 所以 pathname 直接是 /videos/xxx.mp4
        const key = pathParts.slice(1).join('/')
        console.log('[Storage] 提取的 key:', key)
        resolve({ url: key, key })
      } else {
        console.error('[Storage] 上传失败:', xhr.status, xhr.statusText)
        reject(new Error(`上传失败: HTTP ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', (e) => {
      console.error('[Storage] 网络错误', e)
      reject(new Error('网络错误，请检查网络连接'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('上传已取消'))
    })

    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.send(file)
  })
}

/**
 * 获取存储服务的类型
 */
export function getStorageType(): 'r2' | 'supabase' | 'none' {
  const hasR2Config = !!(
    process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  )

  if (hasR2Config) return 'r2'

  const hasSupabaseConfig = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  if (hasSupabaseConfig) return 'supabase'

  return 'none'
}
