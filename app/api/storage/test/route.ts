import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME

function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId || '',
      secretAccessKey: r2SecretAccessKey || ''
    }
  })
}

export async function GET(request: NextRequest) {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    tests: {}
  }

  results.tests.env = {
    hasAccountId: !!r2AccountId,
    hasAccessKeyId: !!r2AccessKeyId,
    hasSecretAccessKey: !!r2SecretAccessKey,
    hasBucketName: !!r2BucketName,
    bucketName: r2BucketName,
    accountId: r2AccountId?.substring(0, 10) + '...',
    env: process.env.NODE_ENV
  }

  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
    return NextResponse.json({
      success: false,
      error: 'R2 配置缺失',
      results
    })
  }

  try {
    const testKey = `test/test-${Date.now()}.txt`

    // 使用 AWS SDK 生成预签名 URL
    const client = getR2Client()
    const command = new PutObjectCommand({
      Bucket: r2BucketName || 'english-learning-videos',
      Key: testKey,
      ContentType: 'text/plain'
    })

    const presignedUrl = await getSignedUrl(client, command, { expiresIn: 3600 })

    results.tests.presignedUrl = {
      success: true,
      key: testKey,
      url: presignedUrl.substring(0, 100) + '...',
      fullUrl: presignedUrl
    }

    // 测试上传
    const testContent = 'R2 upload test - ' + new Date().toISOString()
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: testContent
    })

    results.tests.upload = {
      success: uploadResponse.ok,
      status: uploadResponse.status,
      statusText: uploadResponse.statusText
    }

    if (!uploadResponse.ok) {
      const responseText = await uploadResponse.text()
      results.tests.upload.error = responseText.substring(0, 500)
    }

    // 测试公开访问
    const publicUrl = `https://${r2AccountId}.r2.cloudflarestorage.com/${r2BucketName}/${testKey}`
    const publicResponse = await fetch(publicUrl)

    results.tests.publicAccess = {
      success: publicResponse.ok,
      status: publicResponse.status,
      statusText: publicResponse.statusText
    }

  } catch (error: any) {
    results.tests.presignedUrl = {
      success: false,
      error: error.message,
      stack: error.stack?.substring(0, 500)
    }
  }

  return NextResponse.json({
    success: true,
    results
  })
}
