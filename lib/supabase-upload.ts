import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadResult {
  path: string
  url: string
  error?: string
}

/**
 * 上传文件到Supabase Storage（通过服务器端API，绕过RLS）
 * @param file 文件对象
 * @param bucket 存储桶名称
 * @param folder 文件夹路径
 * @param onProgress 进度回调函数
 * @returns 上传结果
 */
export async function uploadFileWithProgress(
  file: File,
  bucket: string = 'videos',
  folder: string = 'videos',
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    console.log('[Supabase Upload] 开始上传文件:', {
      fileName: file.name,
      fileSize: file.size,
      bucket,
      folder
    })

    // 使用 FormData 包装文件
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', bucket)
    formData.append('folder', folder)

    // 调用服务器端API（使用 Service Role Key 绕过 RLS）
    const response = await fetch('/api/storage/upload', {
      method: 'POST',
      body: formData
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      console.error('[Supabase Upload] 上传失败:', result.error)
      return {
        path: '',
        url: '',
        error: result.error || '上传失败'
      }
    }

    console.log('[Supabase Upload] 上传成功:', result.data.path)

    return {
      path: result.data.path,
      url: result.data.path // 返回相对路径而不是完整URL，避免超出数据库列长度限制
    }
  } catch (error) {
    console.error('[Supabase Upload] 上传文件失败:', error)
    return {
      path: '',
      url: '',
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 上传多个文件
 * @param files 文件数组
 * @param bucket 存储桶名称
 * @param folder 文件夹路径
 * @param onProgress 总体进度回调
 * @returns 上传结果数组
 */
export async function uploadMultipleFiles(
  files: File[],
  bucket: string = 'videos',
  folder: string = 'videos',
  onProgress?: (current: number, total: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = []

  for (let i = 0; i < files.length; i++) {
    const result = await uploadFileWithProgress(files[i], bucket, folder)
    results.push(result)

    if (onProgress) {
      onProgress(i + 1, files.length)
    }
  }

  return results
}

/**
 * 删除文件
 * @param path 文件路径
 * @param bucket 存储桶名称
 * @returns 是否成功
 */
export async function deleteFile(
  path: string,
  bucket: string = 'videos'
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error('删除文件失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('删除文件失败:', error)
    return false
  }
}

/**
 * 获取文件公开URL
 * @param path 文件路径
 * @param bucket 存储桶名称
 * @returns 公开URL
 */
export function getPublicUrl(
  path: string,
  bucket: string = 'videos'
): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return data.publicUrl
}
