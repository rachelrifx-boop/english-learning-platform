import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// R2 配置
const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'english-learning-videos'
const r2CustomDomain = process.env.CLOUDFLARE_R2_CUSTOM_DOMAIN

// 检查是否配置了 R2
const hasR2Config = !!(r2AccountId && r2AccessKeyId && r2SecretAccessKey)

// 创建 Supabase 客户端（如果配置了）
let supabaseAdmin: any = null
if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
}

// 创建 R2 客户端（如果配置了）
let r2Client: S3Client | null = null
if (hasR2Config) {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string || 'videos'
    const folder = formData.get('folder') as string || 'videos'

    if (!file) {
      return NextResponse.json(
        { success: false, error: '没有找到文件' },
        { status: 400 }
      )
    }

    console.log('[STORAGE UPLOAD] 开始上传:', {
      fileName: file.name,
      fileSize: file.size,
      bucket,
      folder,
      storage: hasR2Config ? 'R2' : 'Supabase'
    })

    // 优先使用 R2（更稳定，支持大文件）
    if (hasR2Config && r2Client) {
      try {
        // 生成唯一文件名
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 15)
        const fileExtension = file.name.includes('.')
          ? file.name.substring(file.name.lastIndexOf('.'))
          : ''
        const fileName = `${timestamp}-${random}${fileExtension}`
        const key = `${folder}/${fileName}`

        console.log('[R2 UPLOAD] 上传到 R2:', key)

        // 将 File 转换为 Buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // 上传到 R2
        const command = new PutObjectCommand({
          Bucket: r2BucketName,
          Key: key,
          Body: buffer,
          ContentType: file.type || 'application/octet-stream',
        })

        await r2Client.send(command)

        // 返回相对路径作为 URL（避免超出数据库列长度限制）
        // 完整 URL 可以在前端或播放时按需构建
        console.log('[R2 UPLOAD] 上传成功:', key)

        return NextResponse.json({
          success: true,
          data: {
            path: key,
            url: key,  // 使用相对路径而不是完整 URL
            storage: 'r2'
          }
        })
      } catch (r2Error: any) {
        console.error('[R2 UPLOAD] 失败:', r2Error)
        // 如果 R2 失败，尝试降级到 Supabase
        if (!supabaseAdmin) {
          throw r2Error
        }
        console.log('[R2 UPLOAD] 降级到 Supabase Storage')
      }
    }

    // 降级到 Supabase Storage
    if (supabaseAdmin) {
      // 生成唯一文件名
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 15)
      const fileName = file.name
      const path = folder ? `${folder}/${timestamp}-${random}-${fileName}` : `${timestamp}-${random}-${fileName}`

      // 将 File 转换为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // 使用 Service Role Key 上传（绕过 RLS）
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(path, buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        })

      if (error) {
        console.error('[SUPABASE UPLOAD] 上传失败:', error)
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        )
      }

      // 获取公开URL
      const { data: urlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(data.path)

      console.log('[SUPABASE UPLOAD] 上传成功:', data.path)

      return NextResponse.json({
        success: true,
        data: {
          path: data.path,
          url: urlData.publicUrl,
          storage: 'supabase'
        }
      })
    }

    return NextResponse.json(
      { success: false, error: '未配置存储服务（R2 或 Supabase）' },
      { status: 500 }
    )
  } catch (error) {
    console.error('[STORAGE UPLOAD] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '上传失败'
      },
      { status: 500 }
    )
  }
}
