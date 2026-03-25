import { uploadToR2 } from './r2-upload'
import { uploadFileWithProgress } from './supabase-upload'

export interface UploadResult {
  url: string
  key?: string
  path?: string
  error?: string
}

/**
 * 统一的上传接口
 * 优先使用服务器端上传（通过 /api/storage/upload），更稳定
 * 如果服务器端上传失败，降级到 R2 直接上传
 *
 * @param file 文件对象
 * @param folder 文件夹路径
 * @param onProgress 上传进度回调
 * @returns 上传结果
 */
export async function uploadFile(
  file: File,
  folder: string = 'videos',
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  console.log('[Storage] 开始上传文件:', file.name, '大小:', (file.size / 1024 / 1024).toFixed(2), 'MB')

  // 优先使用服务器端上传（更稳定，避免 CORS 问题）
  try {
    console.log('[Storage] 使用服务器端上传（/api/storage/upload）')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'english-learning-videos')
    formData.append('folder', folder)

    const xhr = new XMLHttpRequest()

    const uploadPromise = new Promise<{ url: string; key: string }>((resolve, reject) => {
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
            if (response.success) {
              console.log('[Storage] 服务器端上传成功:', response.data)
              resolve({
                url: response.data.url || response.data.path,
                key: response.data.path || response.data.url
              })
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
    return {
      url: result.url,
      key: result.key
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
        key: result.key
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
