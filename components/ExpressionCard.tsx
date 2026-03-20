'use client'

import { useState } from 'react'
import { Star, X, Clock } from 'lucide-react'

interface ExpressionCardProps {
  text: string
  translation: string
  timestamp: number
  videoTitle?: string
  isSaved?: boolean
  onSave?: () => void
  onClose?: () => void
}

export function ExpressionCard({
  text,
  translation,
  timestamp,
  videoTitle,
  isSaved,
  onSave,
  onClose
}: ExpressionCardProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-surface-light rounded-xl shadow-xl overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-6 py-4 bg-surface border-b border-gray-700">
        <div className="flex items-center gap-2 text-accent">
          <Clock size={18} />
          <span className="text-sm font-mono">{formatTime(timestamp)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            className={`p-2 rounded-lg transition-colors ${
              isSaved
                ? 'text-accent bg-accent/20'
                : 'text-gray-400 hover:text-accent hover:bg-accent/10'
            }`}
            title={isSaved ? '已收藏' : '收藏'}
          >
            <Star size={18} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 内容 */}
      <div className="p-6">
        {/* 英文原文 */}
        <div className="mb-4">
          <h4 className="text-sm text-gray-400 mb-2">英文</h4>
          <p className="text-lg text-white font-medium leading-relaxed">{text}</p>
        </div>

        {/* 中文翻译 */}
        <div>
          <h4 className="text-sm text-gray-400 mb-2">中文</h4>
          <p className="text-gray-300 leading-relaxed">{translation}</p>
        </div>

        {/* 视频来源 */}
        {videoTitle && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500">来自: {videoTitle}</p>
          </div>
        )}
      </div>
    </div>
  )
}
