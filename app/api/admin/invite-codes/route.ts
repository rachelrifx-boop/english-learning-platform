import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '无权访问' }, { status: 403 })
    }

    const body = await request.json()
    const { count = 1, maxUses = 1, expiresInDays } = body

    if (count < 1 || count > 100) {
      return NextResponse.json(
        { success: false, error: '生成数量必须在 1-100 之间' },
        { status: 400 }
      )
    }

    // 计算过期时间
    let expiresAt = null
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)
    }

    // 批量生成邀请码
    const codes = await Promise.all(
      Array.from({ length: count }, async () => {
        const code = nanoid(10).toUpperCase()
        return prisma.inviteCode.create({
          data: {
            code,
            maxUses,
            expiresAt
          }
        })
      })
    )

    return NextResponse.json({
      success: true,
      data: { codes }
    })
  } catch (error) {
    console.error('Generate invite codes error:', error)
    return NextResponse.json(
      { success: false, error: '生成邀请码失败' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '无权访问' }, { status: 403 })
    }

    const codes = await prisma.inviteCode.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: { codes }
    })
  } catch (error) {
    console.error('Get invite codes error:', error)
    return NextResponse.json(
      { success: false, error: '获取邀请码列表失败' },
      { status: 500 }
    )
  }
}
