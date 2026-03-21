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
 * 优先使用Cloudflare R2（如果有配置），否则使用Supabase Storage
 *
 * @param file 文件对象
 * @param folder 文件夹路径
 * @returns 上传结果
 */
export async function uploadFile(
  file: File,
  folder: string = 'videos'
): Promise<UploadResult> {
  // 检查是否配置了R2
  const hasR2Config = !!(
    process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  )

  // 检查是否配置了Supabase
  const hasSupabaseConfig = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // 优先使用R2（支持大文件）
  if (hasR2Config) {
    console.log('[Storage] 使用Cloudflare R2上传')
    const result = await uploadToR2(file, folder)
    return {
      url: result.url,
      key: result.key,
      error: result.error,
    }
  }

  // 降级到Supabase Storage
  if (hasSupabaseConfig) {
    console.log('[Storage] 使用Supabase Storage上传')
    const result = await uploadFileWithProgress(file, 'videos', folder)
    return {
      url: result.url,
      path: result.path,
      error: result.error,
    }
  }

  // 都没有配置
  return {
    url: '',
    error: '未配置存储服务（R2或Supabase）',
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
