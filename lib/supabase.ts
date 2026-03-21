import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface UploadResult {
  path: string
  url: string
  error?: string
}

/**
 * 上传文件到Supabase Storage
 * @param file 文件对象（File或Buffer）
 * @param bucket 存储桶名称
 * @param folder 文件夹路径（可选）
 * @returns 上传结果
 */
export async function uploadFile(
  file: File | Buffer,
  bucket: string = 'videos',
  folder?: string
): Promise<UploadResult> {
  try {
    // 生成文件名（使用时间戳 + 随机数）
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    const fileName = file instanceof File ? file.name : `file-${timestamp}-${random}`

    // 构建完整路径
    const path = folder ? `${folder}/${fileName}` : fileName

    // 上传文件
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
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
 * 删除Supabase Storage中的文件
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
 * 获取文件的公开URL
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
