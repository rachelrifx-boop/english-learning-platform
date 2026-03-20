import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      )
    }

    // 更新用户为管理员
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' }
    })

    return NextResponse.json({
      success: true,
      message: `用户 ${email} 已成功设置为管理员`,
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          role: updatedUser.role
        }
      }
    })
  } catch (error) {
    console.error('Make admin error:', error)
    return NextResponse.json(
      { success: false, error: '设置管理员失败' },
      { status: 500 }
    )
  }
}
