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
 * 使用Cloudflare R2（预签名 URL 直接上传），绕过 Vercel 大小限制
 *
 * 注意：客户端代码无法访问 process.env，所以直接使用 R2
 * 如果 R2 端点失败，服务器会返回错误信息
 *
 * @param file 文件对象
 * @param folder 文件夹路径
 * @param onProgress 上传进度回调（目前仅支持 R2 上传）
 * @returns 上传结果
 */
export async function uploadFile(
  file: File,
  folder: string = 'videos',
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  // 客户端直接使用 R2（预签名 URL 方式）
  // 服务器端会检查 R2 配置是否正确
  console.log('[Storage] 使用Cloudflare R2上传（预签名 URL）')

  try {
    const result = await uploadToR2(file, folder, onProgress)
    return {
      url: result.url,
      key: result.key,
      error: result.error,
    }
  } catch (error) {
    // 如果 R2 上传失败，检查是否是 Supabase 配置的降级
    const hasSupabaseConfig = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    if (hasSupabaseConfig && file.size < 5 * 1024 * 1024) {
      // 只对小文件使用 Supabase 降级（小于 5MB）
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
      error: error instanceof Error ? error.message : '上传失败'
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
