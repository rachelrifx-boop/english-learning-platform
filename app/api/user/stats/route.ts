import { NextRequest, NextResponse } from 'next/server'
import { verifyUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 获取用户学习统计数据
export async function GET(request: NextRequest) {
  try {
    const user = await verifyUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '需要登录' },
        { status: 401 }
      )
    }

    // 获取收藏课程数
    const favoriteCount = await prisma.favoriteVideo.count({
      where: { userId: user.id }
    })

    // 获取已完成的课程数
    const completedCount = await prisma.userProgress.count({
      where: {
        userId: user.id,
        completed: true
      }
    })

    // 计算总学习时长（基于所有学习记录的总观看时长）
    const allProgress = await prisma.userProgress.findMany({
      where: { userId: user.id }
    })

    const totalWatchDuration = allProgress.reduce((sum, progress) => {
      return sum + (progress.watchDuration || 0)
    }, 0)

    // 转换为小时（保留一位小数）
    const hoursLearned = totalWatchDuration > 0 ? (totalWatchDuration / 3600).toFixed(1) : '0.0'

    // 获取连续打卡天数
    const streakDays = await calculateStreak(user.id)

    return NextResponse.json({
      success: true,
      data: {
        favoriteCount,
        completedCourses: completedCount,
        hoursLearned,
        streakDays
      }
    })
  } catch (error) {
    console.error('Get user stats error:', error)
    return NextResponse.json(
      { success: false, error: '获取统计数据失败' },
      { status: 500 }
    )
  }
}

// 计算连续打卡天数
async function calculateStreak(userId: string): Promise<number> {
  const checkIns = await prisma.checkIn.findMany({
    where: { userId },
    orderBy: { date: 'desc' }
  })

  if (checkIns.length === 0) {
    return 0
  }

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 检查今天或昨天是否有打卡记录
  const latestCheckIn = checkIns[0]
  const latestDate = new Date(latestCheckIn.date)
  latestDate.setHours(0, 0, 0, 0)

  const dayDiff = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24))

  // 如果最新打卡不是今天或昨天，连续打卡中断
  if (dayDiff > 1) {
    return 0
  }

  // 从最新打卡日期开始向前计算连续天数
  let checkDate = new Date(latestDate)

  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0]
    const found = checkIns.some(checkIn => {
      const checkInDate = new Date(checkIn.date)
      checkInDate.setHours(0, 0, 0, 0)
      return checkInDate.toISOString().split('T')[0] === dateStr
    })

    if (found) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}
