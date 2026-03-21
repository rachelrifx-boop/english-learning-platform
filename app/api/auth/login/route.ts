import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import { signToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // 调试日志
    console.log('[LOGIN] 登录请求:', { email, timestamp: new Date().toISOString() })
    console.log('[LOGIN] JWT_SECRET存在:', !!process.env.JWT_SECRET)
    console.log('[LOGIN] NODE_ENV:', process.env.NODE_ENV)
    console.log('[LOGIN] DATABASE_URL存在:', !!process.env.DATABASE_URL)

    // 验证必填字段
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '请填写邮箱和密码' },
        { status: 400 }
      )
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.log('[LOGIN] 用户不存在')
      return NextResponse.json(
        { success: false, error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    console.log('[LOGIN] 用户存在:', user.username)

    // 验证密码
    const isValid = await verifyPassword(password, user.passwordHash)

    if (!isValid) {
      console.log('[LOGIN] 密码错误')
      return NextResponse.json(
        { success: false, error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    console.log('[LOGIN] 密码正确，生成token...')

    // 签发 JWT
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    console.log('[LOGIN] Token生成成功，长度:', token.length)

    // 设置 httpOnly cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role
        }
      }
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    console.log('[LOGIN] 登录成功')
    return response
  } catch (error) {
    console.error('[LOGIN] 详细错误信息:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json(
      {
        success: false,
        error: '登录失败，请稍后重试',
        debug: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    )
  }
}
