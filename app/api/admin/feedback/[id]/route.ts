import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
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
    const { status } = body

    if (!status || !['pending', 'reviewed', 'resolved'].includes(status)) {
      return NextResponse.json(
        { success: false, error: '无效的状态' },
        { status: 400 }
      )
    }

    const feedback = await prisma.feedback.update({
      where: { id: params.id },
      data: { status }
    })

    return NextResponse.json({
      success: true,
      data: { feedback }
    })
  } catch (error) {
    console.error('Update feedback error:', error)
    return NextResponse.json(
      { success: false, error: '更新反馈失败' },
      { status: 500 }
    )
  }
}
