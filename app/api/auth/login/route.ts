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

    // 测试数据库连接
    try {
      await prisma.$connect()
      console.log('[LOGIN] 数据库连接成功')
    } catch (dbError) {
      console.error('[LOGIN] 数据库连接失败:', dbError)
      return NextResponse.json(
        { success: false, error: '数据库连接失败，请稍后重试' },
        { status: 500 }
      )
    }

    // 查找用户并关联邀请码信息
    const user = await prisma.user.findUnique({
      where: { email },
      include: { inviteCode: true }
    })

    if (!user) {
      console.log('[LOGIN] 用户不存在')
      return NextResponse.json(
        { success: false, error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    console.log('[LOGIN] 用户存在:', user.username)

    // 检查用户使用的邀请码是否过期（跳过管理员和第一个用户）
    if (user.inviteCode && user.role !== 'ADMIN') {
      const invite = user.inviteCode
      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        console.log('[LOGIN] 邀请码已过期:', invite.code)
        return NextResponse.json(
          { success: false, error: '您的邀请码已过期，请联系管理员获取新邀请码' },
          { status: 403 }
        )
      }
    }

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

    // 使用 'lax' 模式以更好地支持各种浏览器环境
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    console.log('[LOGIN] 登录成功')
    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error('[LOGIN] 详细错误信息:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : undefined
    })

    return NextResponse.json(
      {
        success: false,
        error: errorMessage || '登录失败，请稍后重试'
      },
      { status: 500 }
    )
  }
}
