import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { signToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, username, password, inviteCode } = body

    // 验证必填字段
    if (!email || !username || !password || !inviteCode) {
      return NextResponse.json(
        { success: false, error: '请填写所有必填字段' },
        { status: 400 }
      )
    }

    // 验证邀请码
    const invite = await prisma.inviteCode.findUnique({
      where: { code: inviteCode },
      include: { users: true }
    })

    if (!invite) {
      return NextResponse.json(
        { success: false, error: '邀请码无效' },
        { status: 400 }
      )
    }

    // 检查邀请码是否过期
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: '邀请码已过期' },
        { status: 400 }
      )
    }

    if (invite.usedCount >= invite.maxUses) {
      return NextResponse.json(
        { success: false, error: '邀请码已达到使用上限' },
        { status: 400 }
      )
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: '该邮箱已被注册' },
        { status: 400 }
      )
    }

    // 哈希密码
    const passwordHash = await hashPassword(password)

    // 检查是否是第一个用户
    const userCount = await prisma.user.count()
    const isFirstUser = userCount === 0

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        inviteCodeId: invite.id,
        role: isFirstUser ? 'ADMIN' : 'USER'
      }
    })

    // 更新邀请码使用次数
    await prisma.inviteCode.update({
      where: { id: invite.id },
      data: { usedCount: invite.usedCount + 1 }
    })

    // 签发 JWT
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role
    })

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
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return response
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { success: false, error: '注册失败，请稍后重试' },
      { status: 500 }
    )
  }
}
