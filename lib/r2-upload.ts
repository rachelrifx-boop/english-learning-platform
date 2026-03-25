/**
 * Cloudflare R2 上传模块（客户端版本）
 * 使用预签名 URL 直接上传到 R2，绕过 Vercel 的大小限制
 */

export interface UploadResult {
  key: string
  url: string
  error?: string
}

/**
 * 上传文件到Cloudflare R2（使用预签名 URL，直接上传）
 * @param file 文件对象
 * @param folder 文件夹路径（如：'videos', 'covers', 'subtitles'）
 * @param onProgress 上传进度回调（0-100）
 * @returns 上传结果
 */
export async function uploadToR2(
  file: File,
  folder: string = 'videos',
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    console.log(`[R2 Client] 开始上传文件: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) 到 ${folder}`)

    // 1. 获取预签名 URL
    const presignedResponse = await fetch('/api/storage/presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        folder
      })
    })

    if (!presignedResponse.ok) {
      const errorText = await presignedResponse.text()
      console.error('[R2 Client] 获取预签名 URL 失败:', presignedResponse.status, errorText)
      return {
        key: '',
        url: '',
        error: `获取上传凭证失败 (HTTP ${presignedResponse.status}): ${errorText.substring(0, 200)}`
      }
    }

    let presignedData
    try {
      presignedData = await presignedResponse.json()
    } catch (parseError) {
      const errorText = await presignedResponse.text()
      console.error('[R2 Client] 解析响应失败:', errorText.substring(0, 200))
      return {
        key: '',
        url: '',
        error: `服务器返回了无效的响应: ${errorText.substring(0, 100)}`
      }
    }

    if (!presignedData.success) {
      console.error('[R2 Client] 获取预签名 URL 失败:', presignedData.error)
      return {
        key: '',
        url: '',
        error: presignedData.error || '获取上传凭证失败'
      }
    }

    const { signedUrl, key, url } = presignedData.data
    console.log('[R2 Client] 预签名 URL 获取成功，开始上传...')
    console.log('[R2 Client] 预签名 URL (前100字符):', signedUrl.substring(0, 100))

    // 2. 直接上传到 R2（使用 fetch API，更稳定）
    const uploadPromise = new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          console.log(`[R2 Client] 上传进度: ${progress}%`)
          if (onProgress) {
            onProgress(progress)
          }
        }
      })

      xhr.addEventListener('load', () => {
        console.log('[R2 Client] 上传响应状态:', xhr.status)
        if (xhr.status === 200) {
          console.log('[R2 Client] 上传成功')
          resolve()
        } else {
          console.error('[R2 Client] 上传失败:', xhr.status, xhr.statusText)
          console.error('[R2 Client] 响应内容:', xhr.responseText.substring(0, 500))
          reject(new Error(`上传失败: HTTP ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', (e) => {
        console.error('[R2 Client] 网络错误', e)
        reject(new Error('网络错误，请检查网络连接'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('上传已取消'))
      })

      xhr.open('PUT', signedUrl)
      // 只设置 Content-Type，不设置其他头部以避免 CORS 问题
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
      xhr.send(file)
    })

    await uploadPromise

    return {
      key: key,
      url: url // 返回相对路径
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
