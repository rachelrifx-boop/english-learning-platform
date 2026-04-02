'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Filter,
  BookOpen,
  Bell,
  ChevronDown,
  CheckCircle2,
  Video,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MessageCircle
} from 'lucide-react'

interface LeftSidebarProps {
  onDifficultyChange?: (difficulty: string | null) => void
  onDurationChange?: (duration: string | null) => void
  onCategoryChange?: (category: string | null) => void
  onShowFavorites?: () => void
  onShowCompleted?: () => void
  totalCourses?: number
  favoriteCount?: number
  completedCourses?: number
  hoursLearned?: string
  streakDays?: number
  checkedDays?: Set<string>
  checkedToday?: boolean
  onCheckIn?: () => void
}

// 话题中文翻译映射
const categoryTranslations: Record<string, string> = {
  'Vlog': 'Vlog',
  'Personal Development': '个人成长',
  'Social Skills': '社交技巧',
  'Communication': '沟通技巧',
  'Psychology': '心理',
  'TED': 'TED',
  'Interview': '访谈',
  'Podcast': '播客',
  'News': '新闻',
  'Finance': '财经',
  'Learning': '学习',
  // 兼容旧分类
  'Daily Life': '日常生活',
  'Health & Fitness': '健康健身',
  'Business': '商务',
  'Career': '职业发展',
  'Technology': '科技',
  'Education': '教育',
  'Science': '科学',
  'Entertainment': '娱乐',
  'Culture': '文化',
  'Travel': '旅行',
  'Food & Cooking': '美食烹饪',
  'Presentation': '演讲',
  'Conversation': '对话',
  'Documentary': '纪录片'
}

export function LeftSidebar({
  onDifficultyChange,
  onDurationChange,
  onCategoryChange,
  onShowFavorites,
  onShowCompleted,
  totalCourses = 0,
  favoriteCount = 0,
  completedCourses = 0,
  hoursLearned = '0.0',
  streakDays = 0,
  checkedDays = new Set(),
  checkedToday = false,
  onCheckIn
}: LeftSidebarProps) {
  const [showFilters, setShowFilters] = useState(true)
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [currentStreak, setCurrentStreak] = useState(streakDays)

  // 当 streakDays prop 改变时更新本地状态
  useEffect(() => {
    setCurrentStreak(streakDays)
  }, [streakDays])

  const difficulties = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  const durations = [
    { label: '0-5分钟', value: '0-5' },
    { label: '5-10分钟', value: '5-10' },
    { label: '10-20分钟', value: '10-20' },
    { label: '20分钟以上', value: '20+' }
  ]
  const categories = [
    'Vlog',
    'Personal Development',
    'Social Skills',
    'Communication',
    'Psychology',
    'TED',
    'Interview',
    'Podcast',
    'News',
    'Finance',
    'Learning'
  ]

  const handleDifficultyClick = (difficulty: string) => {
    const newValue = selectedDifficulty === difficulty ? null : difficulty
    setSelectedDifficulty(newValue)
    onDifficultyChange?.(newValue)
  }

  const handleDurationClick = (duration: string) => {
    const newValue = selectedDuration === duration ? null : duration
    setSelectedDuration(newValue)
    onDurationChange?.(newValue)
  }

  const handleCategoryClick = (category: string) => {
    const newValue = selectedCategory === category ? null : category
    setSelectedCategory(newValue)
    onCategoryChange?.(newValue)
  }

  const clearAllFilters = () => {
    setSelectedDifficulty(null)
    setSelectedDuration(null)
    setSelectedCategory(null)
    onDifficultyChange?.(null)
    onDurationChange?.(null)
    onCategoryChange?.(null)
  }

  const hasActiveFilters = selectedDifficulty || selectedDuration || selectedCategory

  // 日历相关函数
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

  const handleCheckIn = () => {
    if (checkedToday) {
      alert('今天已经打过卡了！')
      return
    }

    if (onCheckIn) {
      onCheckIn()
    }
  }

  const calculateStreak = () => {
    const today = new Date()
    let streak = 0
    const checkDate = new Date(today)

    for (let i = 0; i < 365; i++) {
      const dateKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
      if (checkedDays.has(dateKey)) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (i === 0) {
        // 如果今天没打卡，从昨天开始检查
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    return streak
  }

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth)
    const today = new Date()
    const isCurrentMonth = today.getMonth() === currentMonth.getMonth() &&
                          today.getFullYear() === currentMonth.getFullYear()

    // 星期标题
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    const weekDayElements = weekDays.map((day, index) => (
      <div key={`weekday-${index}`} className="text-center text-xs text-gray-500 py-1">
        {day}
      </div>
    ))

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
          onClick={() => {}}
          className={`aspect-square flex items-center justify-center rounded-lg text-sm cursor-pointer transition-colors ${
            isChecked
              ? 'bg-accent text-white font-medium'
              : isToday
              ? 'bg-accent/20 text-accent border border-accent'
              : 'text-gray-400 hover:bg-surface'
          }`}
        >
          {day}
        </div>
      )
    })

    return [...weekDayElements, ...blankElements, ...dayElements]
  }

  return (
    <div className="w-64 h-screen bg-surface-light border-r border-gray-800 p-4 flex flex-col gap-4 overflow-y-auto sidebar-scrollbar">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Video className="text-accent" size={24} />
        <h1 className="text-lg font-bold text-white">Onsay Lab</h1>
      </div>

      {/* 学习统计 */}
      <div className="bg-surface rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">总课程（更新中）</span>
          <span className="text-lg font-bold text-accent">{totalCourses}</span>
        </div>
        <button
          onClick={onShowFavorites}
          className="flex items-center justify-between w-full group"
        >
          <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">收藏课程</span>
          <span className="text-lg font-bold text-accent-2">{favoriteCount}</span>
        </button>
        <button
          onClick={onShowCompleted}
          className="flex items-center justify-between w-full group"
        >
          <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">已完成课程</span>
          <span className="text-lg font-bold text-accent">{completedCourses}</span>
        </button>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">学习时长</span>
          <span className="text-lg font-bold text-accent">{hoursLearned}h</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">连续打卡</span>
          <span className="text-lg font-bold text-accent-2">{currentStreak}天</span>
        </div>
      </div>

      {/* 每日打卡 */}
      <div className="space-y-3">
        <button
          onClick={handleCheckIn}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-accent to-accent-2 text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          <CheckCircle2 size={20} />
          每日打卡
        </button>

        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-surface text-gray-300 rounded-lg hover:bg-surface-light transition-colors text-sm"
        >
          <CalendarIcon size={16} />
          {showCalendar ? '隐藏日历' : '查看打卡日历'}
        </button>

        {showCalendar && (
          <div className="bg-surface rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => changeMonth(-1)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium text-white">
                {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
              </span>
              <button
                onClick={() => changeMonth(1)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          </div>
        )}
      </div>

      {/* 视频筛选 */}
      <div className="space-y-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2 text-gray-300">
            <Filter size={18} />
            <span className="font-medium">视频筛选</span>
          </div>
          <ChevronDown
            size={18}
            className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
          />
        </div>

        {showFilters && (
          <div className="space-y-4 pl-6">
            {/* 难度筛选 */}
            <div>
              <h4 className="text-xs text-gray-500 mb-2">难度级别</h4>
              <div className="flex flex-wrap gap-2">
                {difficulties.map((diff) => (
                  <button
                    key={diff}
                    onClick={() => handleDifficultyClick(diff)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      selectedDifficulty === diff
                        ? 'bg-accent text-white'
                        : 'bg-surface text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* 时长筛选 */}
            <div>
              <h4 className="text-xs text-gray-500 mb-2">视频时长</h4>
              <div className="grid grid-cols-2 gap-2">
                {durations.map((dur) => (
                  <button
                    key={dur.value}
                    onClick={() => handleDurationClick(dur.value)}
                    className={`text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      selectedDuration === dur.value
                        ? 'bg-accent/20 text-accent'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-surface'
                    }`}
                  >
                    {dur.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 话题筛选 */}
            <div>
              <h4 className="text-xs text-gray-500 mb-2">视频话题</h4>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryClick(cat)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      selectedCategory === cat
                        ? 'bg-accent-2 text-white'
                        : 'bg-surface text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    {categoryTranslations[cat] || cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 清除筛选 */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="w-full px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
              >
                清除所有筛选
              </button>
            )}
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <div className="space-y-2 flex-shrink-0">
        <Link
          href="/vocabulary"
          className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-surface rounded-lg transition-colors"
        >
          <BookOpen size={20} />
          <span>单词本</span>
        </Link>
        <Link
          href="/notes"
          className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-surface rounded-lg transition-colors"
        >
          <CalendarIcon size={20} />
          <span>学习笔记</span>
        </Link>
        <button className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-surface rounded-lg transition-colors w-full text-left relative">
          <Bell size={20} />
          <span>消息通知</span>
          <span className="absolute right-4 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <Link
          href="/feedback"
          className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-surface rounded-lg transition-colors"
        >
          <MessageCircle size={20} />
          <span>意见反馈</span>
        </Link>
      </div>
    </div>
  )
}
