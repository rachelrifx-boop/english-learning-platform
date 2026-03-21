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
 * 上传文件到Supabase Storage（带进度回调）
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
    // 生成唯一文件名
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    const fileName = file.name
    const path = folder ? `${folder}/${timestamp}-${random}-${fileName}` : `${timestamp}-${random}-${fileName}`

    // 上传文件
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        // Supabase会自动处理大文件分块上传
      })

    if (error) {
      console.error('Supabase Storage上传错误:', error)
      return {
        path: '',
        url: '',
        error: error.message
      }
    }

    // 获取公开URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return {
      path: data.path,
      url: urlData.publicUrl
    }
  } catch (error) {
    console.error('上传文件失败:', error)
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
