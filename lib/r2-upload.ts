import { S3Client, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3'

// Cloudflare R2配置
const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID!
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos'

// 创建R2客户端
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
  },
})

export interface UploadResult {
  key: string
  url: string
  error?: string
}

/**
 * 上传文件到Cloudflare R2
 * @param file 文件对象
 * @param folder 文件夹路径（如：'videos', 'covers', 'subtitles'）
 * @returns 上传结果
 */
export async function uploadToR2(
  file: File,
  folder: string = 'videos'
): Promise<UploadResult> {
  try {
    // 生成唯一文件名
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.includes('.')
      ? file.name.substring(file.name.lastIndexOf('.'))
      : ''
    const fileName = `${timestamp}-${random}${fileExtension}`
    const key = `${folder}/${fileName}`

    console.log(`[R2] 开始上传文件: ${key}`)

    // 将File转换为Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 上传到R2
    const command = new PutObjectCommand({
      Bucket: r2BucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    })

    await r2Client.send(command)

    // 构建公开访问URL（需要配置R2的Public Bucket）
    // 如果配置了自定义域名，使用自定义域名
    const customDomain = process.env.CLOUDFLARE_R2_CUSTOM_DOMAIN
    const url = customDomain
      ? `https://${customDomain}/${key}`
      : `https://${r2BucketName}.${r2AccountId}.r2.cloudflarestorage.com/${key}`

    console.log(`[R2] 上传成功: ${key}`)

    return {
      key,
      url,
    }
  } catch (error) {
    console.error('[R2] 上传失败:', error)
    return {
      key: '',
      url: '',
      error: error instanceof Error ? error.message : '未知错误',
    }
  }
}

/**
 * 删除R2中的文件
 * @param keys 文件key数组
 * @returns 是否成功
 */
export async function deleteFromR2(keys: string[]): Promise<boolean> {
  try {
    if (keys.length === 0) return true

    const command = new DeleteObjectsCommand({
      Bucket: r2BucketName,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
        Quiet: false,
      },
    })

    await r2Client.send(command)
    console.log(`[R2] 删除成功: ${keys.length}个文件`)
    return true
  } catch (error) {
    console.error('[R2] 删除失败:', error)
    return false
  }
}

/**
 * 获取文件的公开URL
 * @param key 文件key
 * @returns 公开URL
 */
export function getR2PublicUrl(key: string): string {
  const customDomain = process.env.CLOUDFLARE_R2_CUSTOM_DOMAIN
  return customDomain
    ? `https://${customDomain}/${key}`
    : `https://${r2BucketName}.${r2AccountId}.r2.cloudflarestorage.com/${key}`
}
