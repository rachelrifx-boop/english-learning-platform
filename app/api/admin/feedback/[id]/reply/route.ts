import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    const user = await verifyAdmin(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { reply } = body

    if (!reply || !reply.trim()) {
      return NextResponse.json(
        { success: false, error: '回复内容不能为空' },
        { status: 400 }
      )
    }

    const feedback = await prisma.feedback.update({
      where: { id: params.id },
      data: {
        reply: reply.trim(),
        replied: true,
        status: 'reviewed'
      },
      include: {
        user: {
          select: {
            username: true,
            email: true
          }
        }
      }
    })

    // TODO: 这里可以添加发送邮件通知用户的逻辑

    return NextResponse.json({
      success: true,
      data: { feedback }
    })
  } catch (error) {
    console.error('Reply to feedback error:', error)
    return NextResponse.json(
      { success: false, error: '回复失败' },
      { status: 500 }
    )
  }
}
