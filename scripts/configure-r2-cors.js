/**
 * Cloudflare R2 CORS 配置脚本
 *
 * 使用方法：
 * 1. 确保 .env 文件中有正确的 R2 配置
 * 2. 运行: node scripts/configure-r2-cors.js
 */

const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = require('@aws-sdk/client-s3')
const fs = require('fs')
const path = require('path')

// 手动读取 .env 文件
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let value = match[2].trim()
        // 移除引号
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        process.env[key] = value
      }
    })
  }
}

loadEnv()

async function checkCurrentCORS(r2Client, bucketName) {
  try {
    const command = new GetBucketCorsCommand({ Bucket: bucketName })
    const result = await r2Client.send(command)
    console.log('[R2 CORS] 当前 CORS 配置:', JSON.stringify(result.CORSConfiguration, null, 2))
    return result.CORSConfiguration
  } catch (error) {
    if (error.name === 'NoSuchCORSConfiguration') {
      console.log('[R2 CORS] 当前没有 CORS 配置')
      return null
    }
    throw error
  }
}

async function configureR2CORS() {
  console.log('[R2 CORS] 开始配置 Cloudflare R2 CORS...')

  const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
  })

  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos'

  // 先检查当前配置
  await checkCurrentCORS(r2Client, bucketName)

  // CORS 配置 - 使用更宽松的规则
  const corsConfiguration = {
    CORSRules: [
      {
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        AllowedOrigins: ['*'],
        ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
        MaxAgeSeconds: 3600,
      },
    ],
  }

  try {
    console.log('[R2 CORS] 正在设置新的 CORS 配置...')
    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfiguration,
    })

    await r2Client.send(command)
    console.log('[R2 CORS] ✅ CORS 配置命令发送成功！')

    // 等待一下再验证
    console.log('[R2 CORS] 等待配置生效...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 验证配置
    await checkCurrentCORS(r2Client, bucketName)

    console.log('[R2 CORS] 存储桶:', bucketName)
    console.log('[R2 CORS] 允许的来源: * (所有域名)')
    console.log('[R2 CORS] 允许的方法: GET, PUT, POST, DELETE, HEAD')
    console.log('[R2 CORS] 允许的头部: *')
    console.log('')
    console.log('⚠️  如果仍然遇到 CORS 错误，可能需要:')
    console.log('⚠️  1. 等待 1-2 分钟让配置完全生效')
    console.log('⚠️  2. 清除浏览器缓存后重试')
    console.log('⚠️  3. 在 Cloudflare Dashboard 中手动配置 CORS')
  } catch (error) {
    console.error('[R2 CORS] ❌ 配置失败:', error)
    console.error('')
    console.error('可能的原因:')
    console.error('1. R2 凭证配置不正确，请检查 .env 文件')
    console.error('2. 存储桶名称不匹配')
    console.error('3. 网络连接问题')
    process.exit(1)
  }
}

configureR2CORS()
