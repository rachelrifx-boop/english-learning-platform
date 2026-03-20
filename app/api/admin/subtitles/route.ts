import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 删除视频的所有字幕
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdmin(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: '视频ID不能为空' },
        { status: 400 }
      )
    }

    // 删除视频的所有字幕
    await prisma.subtitle.deleteMany({
      where: { videoId }
    })

    return NextResponse.json({
      success: true,
      message: '字幕删除成功'
    })
  } catch (error) {
    console.error('Delete subtitles error:', error)
    return NextResponse.json(
      { success: false, error: '删除字幕失败' },
      { status: 500 }
    )
  }
}

// 更新字幕内容
export async function PATCH(request: NextRequest) {
  try {
    const user = await verifyAdmin(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { videoId, subtitleId, enText, zhText } = body

    if (!videoId || !subtitleId) {
      return NextResponse.json(
        { success: false, error: '视频ID和字幕ID不能为空' },
        { status: 400 }
      )
    }

    // 获取英文字幕
    const enSubtitle = await prisma.subtitle.findFirst({
      where: {
        videoId,
        language: 'EN'
      }
    })

    if (!enSubtitle) {
      return NextResponse.json(
        { success: false, error: '未找到英文字幕' },
        { status: 404 }
      )
    }

    // 解析字幕内容
    const content = JSON.parse(enSubtitle.content)
    const subtitleIndex = content.findIndex((s: any) => s.id === subtitleId)

    if (subtitleIndex === -1) {
      return NextResponse.json(
        { success: false, error: '未找到指定的字幕' },
        { status: 404 }
      )
    }

    // 更新字幕文本
    if (enText !== undefined) {
      // 检查text是字符串还是对象
      if (typeof content[subtitleIndex].text === 'string') {
        content[subtitleIndex].text = enText
      } else {
        content[subtitleIndex].text.en = enText
        if (zhText !== undefined) {
          content[subtitleIndex].text.zh = zhText
        }
      }
    }

    // 保存更新后的英文字幕
    await prisma.subtitle.update({
      where: { id: enSubtitle.id },
      data: {
        content: JSON.stringify(content)
      }
    })

    // 如果提供了中文翻译，也更新中文字幕
    if (zhText !== undefined) {
      const zhSubtitle = await prisma.subtitle.findFirst({
        where: {
          videoId,
          language: 'ZH'
        }
      })

      if (zhSubtitle) {
        const zhContent = JSON.parse(zhSubtitle.content)
        const zhIndex = zhContent.findIndex((s: any) =>
          Math.abs(s.startTime - content[subtitleIndex].startTime) < 500
        )

        if (zhIndex !== -1) {
          zhContent[zhIndex].text = zhText

          await prisma.subtitle.update({
            where: { id: zhSubtitle.id },
            data: {
              content: JSON.stringify(zhContent)
            }
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '字幕更新成功'
    })
  } catch (error) {
    console.error('Update subtitle error:', error)
    return NextResponse.json(
      { success: false, error: '更新字幕失败' },
      { status: 500 }
    )
  }
}
