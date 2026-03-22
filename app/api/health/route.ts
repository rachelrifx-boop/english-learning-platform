import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('[HEALTH] Health check requested')
    console.log('[HEALTH] NODE_ENV:', process.env.NODE_ENV)
    console.log('[HEALTH] DATABASE_URL exists:', !!process.env.DATABASE_URL)
    console.log('[HEALTH] JWT_SECRET exists:', !!process.env.JWT_SECRET)

    // 测试数据库连接
    const userCount = await prisma.user.count()
    console.log('[HEALTH] User count:', userCount)

    return NextResponse.json({
      success: true,
      status: 'healthy',
      database: 'connected',
      userCount: userCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    const errorCode = error instanceof Error && 'code' in error ? error.code : undefined

    console.error('[HEALTH] Health check failed:', {
      message: errorMessage,
      stack: errorStack,
      code: errorCode,
      name: error instanceof Error ? error.name : undefined
    })

    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      database: 'disconnected',
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
