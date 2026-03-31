'use client'

import { useState, useEffect } from 'react'
import { VideoCard } from '@/components/VideoCard'
import { ArrowLeft, Heart } from 'lucide-react'
import Link from 'next/link'

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchFavorites()
  }, [])

  const fetchFavorites = async () => {
    setLoading(true)
    try {
      // 直接从数据库获取用户的收藏视频
      const response = await fetch('/api/user/favorites')
      const data = await response.json()
      if (data.success && data.data.videos) {
        setFavorites(data.data.videos)
      } else {
        setFavorites([])
      }
    } catch (error) {
      console.error('获取收藏视频失败:', error)
      setFavorites([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* 顶部导航 */}
      <header className="bg-surface-light border-b border-gray-800 sticky top-0 z-40">
        <div className="px-4 sm:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 text-gray-300 hover:text-white hover:bg-surface rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-heading font-bold text-white">
                  我的收藏
                </h1>
                <p className="text-xs text-gray-400 hidden sm:block">
                  {favorites.length} 个收藏视频
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-accent">
              <Heart size={20} fill="currentColor" />
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="px-4 sm:px-8 py-6">
        {loading ? (
          <div className="text-center py-20 text-gray-400">加载中...</div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-20">
            <Heart size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-lg text-gray-400 mb-2">还没有收藏的视频</p>
            <p className="text-sm text-gray-500 mb-6">点击视频卡片上的爱心图标收藏喜欢的视频</p>
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              浏览视频
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {favorites.map((video, index) => (
              <VideoCard key={video.id} video={video} index={index} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
