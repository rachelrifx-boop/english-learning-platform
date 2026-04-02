import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, hashPassword } from '@/lib/password'
import { getToken } from '@/lib/auth'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { currentPassword, newPassword } = body

    // 验证必填字段
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: '请填写当前密码和新密码' },
        { status: 400 }
      )
    }

    // 验证新密码长度
    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: '新密码长度至少为6位' },
        { status: 400 }
      )
    }

    // 获取当前用户
    const token = getToken(request)
    if (!token) {
      return NextResponse.json(
        { success: false, message: '未登录，请先登录' },
        { status: 401 }
      )
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: token.userId }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    // 验证当前密码
    const isValid = await verifyPassword(currentPassword, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: '当前密码错误' },
        { status: 401 }
      )
    }

    // 哈希新密码
    const newPasswordHash = await hashPassword(newPassword)

    // 更新密码
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash }
    })

    console.log('[PASSWORD UPDATE] 密码修改成功:', { userId: user.id })

    return NextResponse.json({
      success: true,
      message: '密码修改成功'
    })
  } catch (error) {
    console.error('[PASSWORD UPDATE] Error:', error)
    return NextResponse.json(
      { success: false, message: '修改密码失败，请稍后重试' },
      { status: 500 }
    )
  }
}
