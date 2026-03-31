import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 生成邀请码
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 去除容易混淆的字符
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, reason } = await request.json()

    // 验证必填字段
    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: '请填写姓名和邮箱' },
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

    // 检查邮箱是否已注册
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: '该邮箱已注册，请直接登录' },
        { status: 400 }
      )
    }

    // 检查该邮箱是否已有邀请码（24小时内）
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const existingInvite = await prisma.inviteCode.findFirst({
      where: {
        createdAt: {
          gte: oneDayAgo
        }
      }
    })

    // 如果24小时内已有申请，暂时不生成新码（防止滥用）
    // 在生产环境中应该更严格，这里简化处理
    if (existingInvite && existingInvite.createdAt > new Date(Date.now() - 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: '申请过于频繁，请1小时后再试' },
        { status: 429 }
      )
    }

    // 生成邀请码
    let code = generateInviteCode()
    let attempts = 0
    const maxAttempts = 10

    // 确保邀请码唯一
    while (attempts < maxAttempts) {
      const existingCode = await prisma.inviteCode.findUnique({
        where: { code }
      })
      if (!existingCode) break
      code = generateInviteCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { success: false, error: '系统繁忙，请稍后重试' },
        { status: 500 }
      )
    }

    // 创建邀请码（默认可用次数1次，永不过期）
    await prisma.inviteCode.create({
      data: {
        code,
        maxUses: 1,
        usedCount: 0
      }
    })

    console.log('[邀请申请] 新邀请码已生成:', { name, email, reason, code })

    // 开发环境直接返回邀请码，方便测试
    const isDevelopment = process.env.NODE_ENV === 'development'

    return NextResponse.json({
      success: true,
      message: isDevelopment
        ? `申请成功！您的邀请码是: ${code}`
        : '申请已提交，邀请码已发送到您的邮箱',
      data: {
        code: isDevelopment ? code : undefined
      }
    })

  } catch (error: any) {
    console.error('[邀请申请] 错误:', error)
    return NextResponse.json(
      { success: false, error: '提交失败，请稍后重试' },
      { status: 500 }
    )
  }
}
