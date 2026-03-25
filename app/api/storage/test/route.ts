import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
    const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
    const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
    const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME

    const hasR2Config = !!(r2AccountId && r2AccessKeyId && r2SecretAccessKey)

    return NextResponse.json({
      success: true,
      data: {
        r2Configured: hasR2Config,
        hasAccountId: !!r2AccountId,
        hasAccessKeyId: !!r2AccessKeyId,
        hasSecretAccessKey: !!r2SecretAccessKey,
        bucketName: r2BucketName,
        env: process.env.NODE_ENV
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '测试失败'
    })
  }
}
