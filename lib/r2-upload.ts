/**
 * Cloudflare R2 上传模块（客户端版本）
 * 通过服务器端 API 进行上传，避免在浏览器中暴露凭证和 CORS 问题
 */

export interface UploadResult {
  key: string
  url: string
  error?: string
}

/**
 * 上传文件到Cloudflare R2（通过服务器端 API）
 * @param file 文件对象
 * @param folder 文件夹路径（如：'videos', 'covers', 'subtitles'）
 * @returns 上传结果
 */
export async function uploadToR2(
  file: File,
  folder: string = 'videos'
): Promise<UploadResult> {
  try {
    console.log(`[R2 Client] 开始上传文件: ${file.name} 到 ${folder}`)

    // 使用 FormData 包装文件
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'videos')
    formData.append('folder', folder)

    // 调用服务器端 API（使用环境变量中的凭证，安全上传）
    const response = await fetch('/api/storage/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[R2 Client] 上传失败:', response.status, errorText)
      return {
        key: '',
        url: '',
        error: `HTTP ${response.status}: ${errorText || '上传失败'}`
      }
    }

    const result = await response.json()

    if (!result.success) {
      console.error('[R2 Client] 上传失败:', result.error)
      return {
        key: '',
        url: '',
        error: result.error || '上传失败'
      }
    }

    console.log('[R2 Client] 上传成功:', result.data.path)

    return {
      key: result.data.path,
      url: result.data.url,
    }
  } catch (error) {
    console.error('[R2 Client] 上传文件失败:', error)
    return {
      key: '',
      url: '',
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 删除R2中的文件（通过服务器端 API）
 * @param keys 文件key数组
 * @returns 是否成功
 */
export async function deleteFromR2(keys: string[]): Promise<boolean> {
  try {
    if (keys.length === 0) return true

    const response = await fetch('/api/storage/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys })
    })

    if (!response.ok) {
      console.error('[R2 Client] 删除失败:', response.status)
      return false
    }

    const result = await response.json()
    if (!result.success) {
      console.error('[R2 Client] 删除失败:', result.error)
      return false
    }

    console.log(`[R2 Client] 删除成功: ${keys.length}个文件`)
    return true
  } catch (error) {
    console.error('[R2 Client] 删除失败:', error)
    return false
  }
}

/**
 * 获取文件的公开URL
 * @param key 文件key
 * @returns 公开URL
 */
export function getR2PublicUrl(key: string): string {
  // 在客户端，我们假设 URL 已经由服务器端生成并存储在数据库中
  // 这个函数主要用于兼容性，实际使用时应从数据库获取 URL
  return `/api/storage/file?key=${encodeURIComponent(key)}`
}
