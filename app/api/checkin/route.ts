import { NextRequest, NextResponse } from 'next/server'
import { verifyUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 获取用户的打卡记录
export async function GET(request: NextRequest) {
  try {
    const user = await verifyUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '需要登录' },
        { status: 401 }
      )
    }

    // 获取所有打卡记录
    const checkIns = await prisma.checkIn.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' }
    })

    // 获取连续打卡天数
    const streakDays = await calculateStreak(user.id)

    // 检查今天是否已打卡
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayCheckIn = await prisma.checkIn.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        checkIns,
        streakDays,
        checkedToday: !!todayCheckIn
      }
    })
  } catch (error) {
    console.error('Get check-ins error:', error)
    return NextResponse.json(
      { success: false, error: '获取打卡记录失败' },
      { status: 500 }
    )
  }
}

// 每日打卡
export async function POST(request: NextRequest) {
  try {
    const user = await verifyUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '需要登录' },
        { status: 401 }
      )
    }

    // 获取今天的日期（时间部分设为00:00:00）
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 检查今天是否已经打卡
    const existing = await prisma.checkIn.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: '今天已经打过卡了' },
        { status: 400 }
      )
    }

    // 创建打卡记录
    const checkIn = await prisma.checkIn.create({
      data: {
        userId: user.id,
        date: today
      }
    })

    // 计算连续打卡天数
    const streakDays = await calculateStreak(user.id)

    return NextResponse.json({
      success: true,
      message: '打卡成功！',
      data: {
        checkIn,
        streakDays
      }
    })
  } catch (error) {
    console.error('Check-in error:', error)
    return NextResponse.json(
      { success: false, error: '打卡失败' },
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
