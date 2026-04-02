import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import { nanoid } from 'nanoid'

// 生成安全的重置token
function generateResetToken(): string {
  return nanoid(64)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: '请提供邮箱地址' },
        { status: 400 }
      )
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: '邮箱格式不正确' },
        { status: 400 }
      )
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email }
    })

    // 无论用户是否存在，都返回成功消息（防止邮箱枚举攻击）
    if (!user) {
      console.log('[FORGOT PASSWORD] 邮箱未注册:', email)
      return NextResponse.json({
        success: true,
        message: '如果该邮箱已注册，您将收到一封重置邮件'
      })
    }

    // 生成重置token
    const resetToken = generateResetToken()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1小时后过期

    // 删除该用户之前的所有重置token
    await prisma.passwordReset.deleteMany({
      where: { userId: user.id }
    })

    // 创建新的重置记录
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt
      }
    })

    console.log('[FORGOT PASSWORD] 创建重置token:', { userId: user.id, email })

    // 构建重置URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

    // 发送邮件
    const emailResult = await sendPasswordResetEmail(email, user.username, resetUrl)

    if (!emailResult.success && !emailResult.resetUrl) {
      console.error('[FORGOT PASSWORD] 发送邮件失败:', emailResult.error)
    }

    return NextResponse.json({
      success: true,
      message: '如果该邮箱已注册，您将收到一封重置邮件'
    })
  } catch (error) {
    console.error('[FORGOT PASSWORD] Error:', error)
    return NextResponse.json(
      { success: false, error: '请求失败，请稍后重试' },
      { status: 500 }
    )
  }
}
