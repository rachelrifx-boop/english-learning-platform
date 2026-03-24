import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // 检查 displayOrder 字段是否已存在
    const checkResult = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'Video'
      AND column_name = 'displayOrder'
    `

    if (Array.isArray(checkResult) && checkResult.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'displayOrder 字段已存在'
      })
    }

    // 添加 displayOrder 字段
    await prisma.$executeRaw`
      ALTER TABLE "Video" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0
    `

    // 为现有视频设置 displayOrder（按创建时间倒序，即最新的在前）
    await prisma.$executeRaw`
      WITH ordered_videos AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" DESC) as rn
        FROM "Video"
      )
      UPDATE "Video" v
      SET "displayOrder" = ov.rn - 1
      FROM ordered_videos ov
      WHERE v.id = ov.id
    `

    return NextResponse.json({
      success: true,
      message: 'displayOrder 字段添加成功'
    })
  } catch (error: any) {
    console.error('[INIT DB] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '初始化数据库失败'
      },
      { status: 500 }
    )
  }
}
