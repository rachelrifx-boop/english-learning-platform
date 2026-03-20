'use client'

import { useState } from 'react'
import { X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'

interface MobileCheckInModalProps {
  isOpen: boolean
  onClose: () => void
  checkedDays: Set<string>
  onCheckIn: () => void
  streak: number
}

// 话题中文翻译映射
const categoryTranslations: Record<string, string> = {
  'Vlog': '视频博客',
  'Interview': '访谈',
  'Presentation': '演讲',
  'Conversation': '对话',
  'Documentary': '纪录片'
}

export function MobileCheckInModal({
  isOpen,
  onClose,
  checkedDays,
  onCheckIn,
  streak
}: MobileCheckInModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  if (!isOpen) return null

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek }
  }

  const changeMonth = (delta: number) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + delta)
    setCurrentMonth(newMonth)
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth)
  const today = new Date()
  const isCurrentMonth = today.getMonth() === currentMonth.getMonth() &&
                        today.getFullYear() === currentMonth.getFullYear()

  // 星期标题
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  // 空白格子
  const blankElements = Array.from({ length: startingDayOfWeek }).map((_, i) => (
    <div key={`blank-${i}`} className="aspect-square" />
  ))

  // 日期元素
  const dayElements = Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
    const dateKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isChecked = checkedDays.has(dateKey)
    const isToday = isCurrentMonth && day === today.getDate()

    return (
      <div
        key={day}
        className={`aspect-square flex items-center justify-center rounded-lg text-sm ${
          isChecked
            ? 'bg-accent text-white font-medium'
            : isToday
            ? 'bg-accent/20 text-accent border border-accent'
            : 'text-gray-400'
        }`}
      >
        {day}
      </div>
    )
  })

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const isTodayChecked = checkedDays.has(todayStr)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 sm:hidden">
      <div className="absolute bottom-0 left-0 right-0 bg-surface-light rounded-t-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <CalendarIcon size={20} className="text-accent" />
            <h3 className="text-lg font-semibold text-white">学习打卡</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 连续打卡统计 */}
          <div className="bg-gradient-to-r from-accent/20 to-accent-2/20 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-400 mb-2">已连续学习</p>
            <p className="text-4xl font-bold text-accent">{streak}</p>
            <p className="text-sm text-gray-400 mt-1">天</p>
          </div>

          {/* 打卡按钮 */}
          <button
            onClick={onCheckIn}
            disabled={isTodayChecked}
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-medium text-lg transition-colors ${
              isTodayChecked
                ? 'bg-surface text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-accent to-accent-2 text-white'
            }`}
          >
            <CheckCircle2 size={24} />
            {isTodayChecked ? '今日已打卡' : '立即打卡'}
          </button>

          {/* 日历 */}
          <div className="bg-surface rounded-xl p-4">
            {/* 月份切换 */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-base font-medium text-white">
                {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
              </span>
              <button
                onClick={() => changeMonth(1)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-xs text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* 日期格子 */}
            <div className="grid grid-cols-7 gap-1">
              {blankElements}
              {dayElements}
            </div>
          </div>

          {/* 提示 */}
          <div className="text-center text-sm text-gray-500">
            <p>坚持每天打卡，培养英语学习习惯</p>
          </div>
        </div>
      </div>
    </div>
  )
}
