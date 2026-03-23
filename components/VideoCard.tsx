'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Clock, Play, Heart } from 'lucide-react'
import { motion } from 'framer-motion'

export interface Video {
  id: string
  title: string
  description: string | null
  coverPath: string | null
  duration: number
  difficulty: string
  category: string | null
}

// 处理封面 URL，确保通过代理访问 R2 上的文件
function getCoverUrl(coverPath: string | null): string | null {
  if (!coverPath) return null

  // 如果是完整 URL，直接返回
  if (coverPath.startsWith('http://') || coverPath.startsWith('https://')) {
    return coverPath
  }

  // 如果是相对路径（R2 存储），通过代理访问
  return `/api/video-proxy/${coverPath}`
}

interface VideoCardProps {
  video: Video
  index?: number
  onFavoriteChange?: () => void
}

const difficultyColors: Record<string, string> = {
  A1: 'bg-green-500/20 text-green-500',
  A2: 'bg-lime-500/20 text-lime-500',
  B1: 'bg-yellow-500/20 text-yellow-500',
  B2: 'bg-orange-500/20 text-orange-500',
  C1: 'bg-red-500/20 text-red-500',
  C2: 'bg-purple-500/20 text-purple-500'
}

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

export function VideoCard({ video, index = 0, onFavoriteChange }: VideoCardProps) {
  const [isFavorited, setIsFavorited] = useState(false)
  const [loading, setLoading] = useState(false)

  // 处理封面 URL
  const coverUrl = useMemo(() => getCoverUrl(video.coverPath), [video.coverPath])

  useEffect(() => {
    checkFavoriteStatus()
  }, [video.id])

  const checkFavoriteStatus = async () => {
    try {
      const response = await fetch(`/api/favorite/check?videoId=${video.id}`)
      const data = await response.json()
      if (data.success) {
        setIsFavorited(data.data.isFavorited)
      }
    } catch (error) {
      console.error('检查收藏状态失败:', error)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (loading) return

    setLoading(true)

    try {
      if (isFavorited) {
        // 取消收藏
        const response = await fetch(`/api/favorite?videoId=${video.id}`, {
          method: 'DELETE'
        })
        const data = await response.json()

        if (data.success) {
          setIsFavorited(false)
          onFavoriteChange?.()
        } else {
          alert(data.error || '取消收藏失败')
        }
      } else {
        // 添加收藏
        const response = await fetch('/api/favorite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: video.id })
        })
        const data = await response.json()

        if (data.success) {
          setIsFavorited(true)
          onFavoriteChange?.()
        } else {
          alert(data.error || '收藏失败')
        }
      }
    } catch (error) {
      console.error('收藏操作失败:', error)
      alert('操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/videos/${video.id}`}>
        <div className="bg-surface-light rounded-xl overflow-hidden hover:ring-2 hover:ring-accent transition-all group cursor-pointer">
          {/* 封面 */}
          <div className="relative aspect-video bg-surface">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                <Play size={48} className="text-white/50" />
              </div>
            )}

            {/* 收藏按钮 */}
            <button
              onClick={toggleFavorite}
              className="absolute top-2 right-2 p-1.5 transition-all duration-200 z-10 group/btn"
              title={isFavorited ? '取消收藏' : '收藏'}
            >
              <div className={`p-1.5 rounded-full transition-all duration-200 ${
                isFavorited
                  ? 'bg-white shadow-lg'
                  : 'bg-black/30 backdrop-blur-sm hover:bg-black/50'
              }`}>
                <Heart
                  size={16}
                  className={`transition-all duration-200 ${
                    isFavorited
                      ? 'fill-red-500 text-red-500 scale-110'
                      : 'text-white fill-transparent'
                  }`}
                />
              </div>
            </button>

            {/* 时长 */}
            <div className="absolute bottom-2 right-2 px-2 py-1 text-white text-xs rounded flex items-center gap-1">
              <Clock size={12} />
              {formatDuration(video.duration)}
            </div>

            {/* 播放按钮遮罩 */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Play size={48} className="text-white" />
              </div>
            </div>
          </div>

          {/* 信息 */}
          <div className="p-4">
            <h3 className="text-lg font-heading font-semibold text-white mb-2 line-clamp-2 group-hover:text-accent transition-colors">
              {video.title}
            </h3>

            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${difficultyColors[video.difficulty] || 'bg-gray-500/20 text-gray-500'}`}>
                {video.difficulty}
              </span>
              {video.category && (
                <span className="px-2 py-1 bg-surface text-gray-400 rounded text-xs">
                  {categoryTranslations[video.category] || video.category}
                </span>
              )}
            </div>

            {video.description && (
              <p className="text-gray-400 text-sm line-clamp-2">{video.description}</p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
