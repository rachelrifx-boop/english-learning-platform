import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码长度至少6位' },
        { status: 400 }
      )
    }

    // 查找有效的重置token
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!resetRecord) {
      console.log('[RESET PASSWORD] Token不存在:', token)
      return NextResponse.json(
        { success: false, error: '无效的重置链接' },
        { status: 400 }
      )
    }

    // 检查是否已使用
    if (resetRecord.used) {
      console.log('[RESET PASSWORD] Token已使用:', token)
      return NextResponse.json(
        { success: false, error: '该重置链接已被使用' },
        { status: 400 }
      )
    }

    // 检查是否过期
    if (resetRecord.expiresAt < new Date()) {
      console.log('[RESET PASSWORD] Token已过期:', token)
      return NextResponse.json(
        { success: false, error: '重置链接已过期，请重新获取' },
        { status: 400 }
      )
    }

    // 哈希新密码
    const passwordHash = await bcrypt.hash(password, 10)

    // 更新用户密码
    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash }
    })

    // 标记token为已使用
    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true }
    })

    console.log('[RESET PASSWORD] 密码重置成功:', { userId: resetRecord.userId })

    return NextResponse.json({
      success: true,
      message: '密码重置成功'
    })
  } catch (error) {
    console.error('[RESET PASSWORD] Error:', error)
    return NextResponse.json(
      { success: false, error: '重置失败，请稍后重试' },
      { status: 500 }
    )
  }
}
