import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 查询当前数据库结构
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'Video'
      AND column_name IN ('filePath', 'coverPath')
    `

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('Query error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Query failed'
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    // 尝试修改列类型
    await prisma.$executeRawUnsafe(`ALTER TABLE "Video" ALTER COLUMN "filePath" TYPE text;`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "Video" ALTER COLUMN "coverPath" TYPE text;`)

    return NextResponse.json({
      success: true,
      message: 'Database schema updated successfully'
    })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Migration failed'
      },
      { status: 500 }
    )
  }
}
