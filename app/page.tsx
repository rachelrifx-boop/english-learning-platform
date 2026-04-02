'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { VideoCard } from '@/components/VideoCard'
import { LeftSidebar } from '@/components/LeftSidebar'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { MobileFilterModal } from '@/components/MobileFilterModal'
import { MobileCheckInModal } from '@/components/MobileCheckInModal'
import { SettingsDropdown } from '@/components/SettingsDropdown'
import { LogOut, User, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'

// 防抖 Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function HomePage() {
  const router = useRouter()
  const [videos, setVideos] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [totalCourses, setTotalCourses] = useState(0)
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [completedCourses, setCompletedCourses] = useState(0)
  const [hoursLearned, setHoursLearned] = useState('0.0')
  const [streakDays, setStreakDays] = useState(0)

  // 视图状态：all（全部课程）, favorites（收藏课程）, completed（已完成课程）
  const [currentView, setCurrentView] = useState<'all' | 'favorites' | 'completed'>('all')
  const [viewTitle, setViewTitle] = useState('全部课程')

  // 筛选状态
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // 移动端弹窗状态
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // 使用防抖的搜索查询
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // 打卡状态
  const [checkedDays, setCheckedDays] = useState<Set<string>>(new Set())
  const [checkedToday, setCheckedToday] = useState(false)

  // 用于跟踪是否已加载的标记
  const isLoadingRef = useRef(false)

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

  // 获取视频列表
  useEffect(() => {
    if (isLoadingRef.current) return
    fetchVideos()
  }, [selectedDifficulty, selectedDuration, selectedCategory, debouncedSearchQuery, currentView])

  // 当用户信息获取成功后，再获取统计数据和打卡记录
  useEffect(() => {
    if (user) {
      fetchUserStats()
      fetchCheckIns()
    }
  }, [user])

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
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    setLoading(true)

    try {
      let videos: any[] = []

      if (currentView === 'favorites') {
        // 获取收藏的视频
        const params = new URLSearchParams()
        params.append('limit', '1000')

        const response = await fetch(`/api/user/favorites?${params.toString()}`)
        const data = await response.json()
        if (data.success) {
          videos = data.data.videos
        }
      } else if (currentView === 'completed') {
        // 获取已完成的视频
        const params = new URLSearchParams()
        params.append('limit', '1000')

        const response = await fetch(`/api/user/completed?${params.toString()}`)
        const data = await response.json()
        if (data.success) {
          videos = data.data.videos
        }
      } else {
        // 获取所有视频
        const params = new URLSearchParams()
        params.append('limit', '1000')
        if (selectedDifficulty) params.append('difficulty', selectedDifficulty)
        if (selectedCategory) params.append('category', selectedCategory)
        if (selectedDuration) params.append('duration', selectedDuration)
        if (debouncedSearchQuery) params.append('search', debouncedSearchQuery)

        const response = await fetch(`/api/videos?${params.toString()}`)
        const data = await response.json()

        if (data.success) {
          videos = data.data.videos
          setCategories(data.data.categories || [])
          setTotalCourses(data.data.pagination?.total || videos.length)
        }
      }

      // 应用时长筛选（如果后端不支持）
      if (selectedDuration && currentView === 'all') {
        videos = videos.filter((v: any) => {
          const minutes = Math.floor(v.duration / 60)
          if (selectedDuration === '0-5') return minutes >= 0 && minutes < 5
          if (selectedDuration === '5-10') return minutes >= 5 && minutes < 10
          if (selectedDuration === '10-20') return minutes >= 10 && minutes <= 20
          if (selectedDuration === '20+') return minutes > 20
          return true
        })
      }

      setVideos(videos)
    } catch (error) {
      console.error('获取视频列表失败:', error)
    } finally {
      setLoading(false)
      isLoadingRef.current = false
    }
  }

  const fetchUserStats = async () => {
    if (!user) return

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
    if (!user) return

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
        await fetchCheckIns()
        await fetchUserStats()
        alert(`打卡成功！已连续学习 ${data.data.streakDays} 天`)
      } else {
        alert(data.error || '打卡失败')
      }
    } catch (error) {
      console.error('打卡失败:', error)
      alert('打卡失败，请重试')
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
    // 搜索已通过防抖自动触发
  }

  const handleFavoriteChange = useCallback((videoId: string, isFavorited: boolean) => {
    // 更新本地视频列表中的收藏状态
    setVideos(prev => prev.map((v: any) =>
      v.id === videoId ? { ...v, isFavorited } : v
    ))
    // 刷新用户统计数据
    if (user) {
      fetchUserStats()
    }
  }, [user])

  const handleShowFavorites = () => {
    setCurrentView('favorites')
    setViewTitle('收藏课程')
    setSelectedDifficulty(null)
    setSelectedDuration(null)
    setSelectedCategory(null)
  }

  const handleShowCompleted = () => {
    setCurrentView('completed')
    setViewTitle('已完成课程')
    setSelectedDifficulty(null)
    setSelectedDuration(null)
    setSelectedCategory(null)
  }

  const handleBackToAll = () => {
    setCurrentView('all')
    setViewTitle('全部课程')
  }

  // 初始化获取用户信息
  useEffect(() => {
    fetchUser()
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-primary">
      {/* 左侧导航 - 桌面端显示，移动端隐藏 */}
      <div className="hidden md:block h-full">
        <LeftSidebar
          onDifficultyChange={setSelectedDifficulty}
          onDurationChange={setSelectedDuration}
          onCategoryChange={setSelectedCategory}
          onShowFavorites={handleShowFavorites}
          onShowCompleted={handleShowCompleted}
          totalCourses={totalCourses}
          favoriteCount={favoriteCount}
          completedCourses={completedCourses}
          hoursLearned={hoursLearned}
          streakDays={streakDays}
          checkedDays={checkedDays}
          checkedToday={checkedToday}
          onCheckIn={handleCheckIn}
        />
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* 顶部导航 */}
        <header className="bg-surface-light border-b border-gray-800 flex-shrink-0">
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
        <main className="flex-1 px-4 sm:px-8 py-4 sm:py-8 pb-20 sm:pb-8 overflow-y-auto custom-scrollbar">
          {/* 视图标题 */}
          {currentView !== 'all' && (
            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={handleBackToAll}
                className="p-2 text-gray-300 hover:text-white hover:bg-surface rounded-lg transition-colors"
              >
                ← 返回全部课程
              </button>
              <h2 className="text-xl font-bold text-white">{viewTitle}</h2>
            </div>
          )}
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
                  搜索: <span className="text-accent">{searchQuery}</span>
                  {debouncedSearchQuery !== searchQuery && (
                    <span className="ml-2 text-gray-500">输入中...</span>
                  )}
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
                {hasActiveFilters || debouncedSearchQuery ? '没有符合条件的视频' : '暂无视频'}
              </p>
              {(hasActiveFilters || debouncedSearchQuery) && (
                <button
                  onClick={() => {
                    clearAllFilters()
                    setSearchQuery('')
                  }}
                  className="mt-4 px-6 py-2 bg-accent text-white rounded-lg"
                >
                  清除筛选
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {videos.map((video: any, index) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    index={index}
                    onFavoriteChange={handleFavoriteChange}
                  />
                ))}
              </div>
            </>
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
