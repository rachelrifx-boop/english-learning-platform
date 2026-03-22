import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value

    console.log('[AUTH/ME] Request received, token exists:', !!token)

    if (!token) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    console.log('[AUTH/ME] Verifying token...')
    const payload = await verifyToken(token)

    if (!payload) {
      console.log('[AUTH/ME] Token verification failed')
      return NextResponse.json(
        { success: false, error: 'Token 无效' },
        { status: 401 }
      )
    }

    console.log('[AUTH/ME] Token verified, userId:', payload.userId)
    console.log('[AUTH/ME] DATABASE_URL exists:', !!process.env.DATABASE_URL)

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true
      }
    })

    if (!user) {
      console.log('[AUTH/ME] User not found')
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      )
    }

    console.log('[AUTH/ME] User found:', user.email)
    return NextResponse.json({
      success: true,
      data: { user }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error('[AUTH/ME] Get user error:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : undefined
    })

    return NextResponse.json(
      { success: false, error: '获取用户信息失败' },
      { status: 500 }
    )
  }
}
