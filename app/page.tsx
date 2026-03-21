'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { VideoCard } from '@/components/VideoCard'
import { LeftSidebar } from '@/components/LeftSidebar'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { MobileFilterModal } from '@/components/MobileFilterModal'
import { MobileCheckInModal } from '@/components/MobileCheckInModal'
import { SettingsDropdown } from '@/components/SettingsDropdown'
import { LogOut, User, Filter, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const [videos, setVideos] = useState([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [totalCourses, setTotalCourses] = useState(0)
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [completedCourses, setCompletedCourses] = useState(0)
  const [hoursLearned, setHoursLearned] = useState('0.0')
  const [streakDays, setStreakDays] = useState(0)

  // 筛选状态
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // 移动端弹窗状态
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // 打卡状态
  const [checkedDays, setCheckedDays] = useState<Set<string>>(new Set())
  const [checkedToday, setCheckedToday] = useState(false)

  const difficulties = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  const durations = [
    { label: '0-5分钟', value: '0-5' },
    { label: '5-10分钟', value: '5-10' },
    { label: '10-20分钟', value: '10-20' },
    { label: '20分钟以上', value: '20+' }
  ]
  const categoryList = [
    'Personal Development',
    'Social Skills',
    'Communication',
    'Daily Life',
    'Health & Fitness',
    'Business',
    'Career',
    'Technology',
    'Education',
    'Science',
    'Entertainment',
    'Culture',
    'Travel',
    'Food & Cooking'
  ]

  const categoryTranslations: Record<string, string> = {
    'Personal Development': '个人成长',
    'Social Skills': '社交技巧',
    'Communication': '沟通技巧',
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
    // 兼容旧分类
    'Vlog': '视频博客',
    'Interview': '访谈',
    'Presentation': '演讲',
    'Conversation': '对话',
    'Documentary': '纪录片'
  }

  useEffect(() => {
    fetchUser()
    fetchVideos()
    fetchUserStats()
    fetchCheckIns()
  }, [selectedDifficulty, selectedDuration, selectedCategory, searchQuery])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()
      if (data.success) {
        setUser(data.data.user)
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }

  const fetchVideos = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedDifficulty) params.append('difficulty', selectedDifficulty)
      if (selectedCategory) params.append('category', selectedCategory)
      if (selectedDuration) params.append('duration', selectedDuration)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/videos?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setVideos(data.data.videos)
        setCategories(data.data.categories || [])
        // 使用当前筛选结果的长度作为总课程数
        setTotalCourses(data.data.videos.length)
      }
    } catch (error) {
      console.error('获取视频列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/user/stats')
      const data = await response.json()
      if (data.success) {
        setFavoriteCount(data.data.favoriteCount)
        setCompletedCourses(data.data.completedCourses)
        setHoursLearned(data.data.hoursLearned)
        setStreakDays(data.data.streakDays)
      }
    } catch (error) {
      console.error('获取用户统计数据失败:', error)
    }
  }

  const fetchCheckIns = async () => {
    try {
      const response = await fetch('/api/checkin')
      const data = await response.json()
      if (data.success) {
        const dates = data.data.checkIns.map((checkIn: any) => {
          const date = new Date(checkIn.date)
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        })
        setCheckedDays(new Set(dates))
        setCheckedToday(data.data.checkedToday)
      }
    } catch (error) {
      console.error('获取打卡记录失败:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('登出失败:', error)
    }
  }

  const handleCheckIn = async () => {
    if (checkedToday) {
      return
    }

    try {
      const response = await fetch('/api/checkin', { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        // 刷新打卡记录和统计数据
        await fetchCheckIns()
        await fetchUserStats()
      }
    } catch (error) {
      console.error('打卡失败:', error)
    }
  }

  const calculateStreak = () => {
    return streakDays
  }

  const clearAllFilters = () => {
    setSelectedDifficulty(null)
    setSelectedDuration(null)
    setSelectedCategory(null)
  }

  const hasActiveFilters = selectedDifficulty || selectedDuration || selectedCategory

  const handleSearchClick = () => {
    setShowSearch(true)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // 搜索已通过useEffect自动触发
  }

  const handleFavoriteChange = () => {
    // 刷新用户统计数据
    fetchUserStats()
  }

  return (
    <div className="flex min-h-screen bg-primary">
      {/* 左侧导航 - 桌面端显示，移动端隐藏 */}
      <div className="hidden md:block">
        <LeftSidebar
          onDifficultyChange={setSelectedDifficulty}
          onDurationChange={setSelectedDuration}
          onCategoryChange={setSelectedCategory}
          totalCourses={totalCourses}
          favoriteCount={favoriteCount}
          completedCourses={completedCourses}
          hoursLearned={hoursLearned}
          streakDays={streakDays}
        />
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部导航 */}
        <header className="bg-surface-light border-b border-gray-800 sticky top-0 z-40">
          <div className="px-4 sm:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-heading font-bold text-white truncate">
                  Onsay Lab
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">影子跟读资料库</p>
              </div>

              <div className="flex items-center gap-3 sm:gap-6">
                {user?.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className="hidden sm:block text-gray-300 hover:text-accent transition-colors"
                  >
                    管理后台
                  </Link>
                )}

                {/* 桌面端用户信息 */}
                <div className="hidden md:flex items-center gap-3 pl-6 border-l border-gray-700">
                  <SettingsDropdown onSearchClick={handleSearchClick} />
                  {user ? (
                    <>
                      <div className="flex items-center gap-2 text-gray-300">
                        <User size={18} />
                        <span className="text-sm">{user.username}</span>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="p-2 text-gray-300 hover:text-accent transition-colors"
                        title="登出"
                      >
                        <LogOut size={18} />
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      className="text-gray-300 hover:text-accent transition-colors"
                    >
                      登录
                    </Link>
                  )}
                </div>

                {/* 移动端筛选按钮 */}
                <button
                  onClick={() => setShowFilterModal(true)}
                  className="md:hidden p-2 text-gray-300 hover:text-accent relative"
                >
                  <SlidersHorizontal size={20} />
                  {hasActiveFilters && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full"></span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* 主内容 */}
        <main className="flex-1 px-4 sm:px-8 py-4 sm:py-8 pb-20 sm:pb-8">
          {/* 搜索框 */}
          {showSearch && (
            <div className="mb-4 animate-fade-in">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索视频标题、描述..."
                  className="w-full px-4 py-3 pl-10 bg-surface border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowSearch(false)
                    setSearchQuery('')
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  ✕
                </button>
              </form>
              {searchQuery && (
                <div className="mt-2 text-sm text-gray-400">
                  搜索结果: <span className="text-accent">{searchQuery}</span>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setShowSearch(false)
                    }}
                    className="ml-2 text-gray-500 hover:text-white"
                  >
                    清除
                  </button>
                </div>
              )}
            </div>
          )}
          {/* 移动端筛选状态指示 */}
          {(selectedDifficulty || selectedDuration || selectedCategory) && (
            <div className="mb-4 flex items-center gap-2 flex-wrap overflow-x-auto pb-2 sm:pb-0">
              <span className="text-sm text-gray-400 shrink-0">筛选:</span>
              {selectedDifficulty && (
                <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-xs sm:text-sm shrink-0">
                  {selectedDifficulty}
                </span>
              )}
              {selectedDuration && (
                <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-xs sm:text-sm shrink-0">
                  {durations.find(d => d.value === selectedDuration)?.label}
                </span>
              )}
              {selectedCategory && (
                <span className="px-3 py-1 bg-accent-2/20 text-accent-2 rounded-full text-xs sm:text-sm shrink-0">
                  {categoryTranslations[selectedCategory]}
                </span>
              )}
            </div>
          )}

          {/* 视频列表 */}
          {loading ? (
            <div className="text-center py-20 text-gray-400">加载中...</div>
          ) : videos.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg mb-2">
                {hasActiveFilters ? '没有符合条件的视频' : '暂无视频'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 px-6 py-2 bg-accent text-white rounded-lg"
                >
                  清除筛选
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {videos.map((video: any, index) => (
                <VideoCard key={video.id} video={video} index={index} onFavoriteChange={handleFavoriteChange} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* 移动端底部导航 */}
      <MobileBottomNav
        user={user}
        onLogout={handleLogout}
        onShowFilters={() => setShowFilterModal(true)}
        onShowCheckIn={() => setShowCheckInModal(true)}
      />

      {/* 移动端筛选弹窗 */}
      <MobileFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        difficulties={difficulties}
        durations={durations}
        categories={categoryList}
        categoryTranslations={categoryTranslations}
        selectedDifficulty={selectedDifficulty}
        selectedDuration={selectedDuration}
        selectedCategory={selectedCategory}
        onDifficultyChange={setSelectedDifficulty}
        onDurationChange={setSelectedDuration}
        onCategoryChange={setSelectedCategory}
        onClearAll={clearAllFilters}
      />

      {/* 移动端打卡弹窗 */}
      <MobileCheckInModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        checkedDays={checkedDays}
        onCheckIn={handleCheckIn}
        streak={calculateStreak()}
      />
    </div>
  )
}
