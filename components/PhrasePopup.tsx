'use client'

import { useState, useRef, useEffect } from 'react'
import { Languages, Volume2, X } from 'lucide-react'
import { speakWord } from '@/lib/dictionary-api'

interface PhraseInfo {
  translation: string
  examples: Array<{
    en: string
    zh: string
  }>
}

interface PhrasePopupProps {
  phrase: string
  info: PhraseInfo
  position: { x: number; y: number }
  onClose: () => void
}

export function PhrasePopup({ phrase, info, position, onClose }: PhrasePopupProps) {
  const popupRef = useRef<HTMLDivElement>(null)

  // 组件挂载时暂停视频
  useEffect(() => {
    const video = document.querySelector('video') as HTMLVideoElement
    if (video) {
      video.pause()
    }

    return () => {
      // 不自动恢复播放，让用户手动继续
    }
  }, [])

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const handleSpeak = () => {
    speakWord(phrase, 'en-US')
  }

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-surface-light rounded-xl shadow-2xl border border-yellow-500/30 overflow-hidden min-w-[360px] max-w-[480px]"
      style={{
        left: `${Math.max(10, Math.min(position.x, window.innerWidth - 400))}px`,
        top: `${Math.max(10, Math.min(position.y, window.innerHeight - 300))}px`,
        maxHeight: '80vh',
        overflowY: 'auto'
      }}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Languages size={16} className="text-yellow-500" />
          <h3 className="text-lg font-bold text-white">{phrase}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleSpeak}
            className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors"
            title="发音"
          >
            <Volume2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-4 space-y-4">
        {/* 中文翻译 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-yellow-500 text-xs font-medium">
            <Languages size={14} />
            <span>中文释义</span>
          </div>
          <p className="text-white text-base leading-relaxed">{info.translation}</p>
        </div>

        {/* 分隔线 */}
        <div className="h-px bg-gray-700"></div>

        {/* 例句 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-medium">
            <span>📝 例句</span>
          </div>
          <div className="space-y-3">
            {info.examples.map((example, index) => (
              <div key={index} className="space-y-2">
                {/* 英文例句 */}
                <p className="text-gray-200 text-sm leading-relaxed">
                  "{example.en}"
                </p>
                {/* 中文翻译 */}
                <p className="text-gray-500 text-sm ml-2">
                  <Languages size={12} className="inline mr-1 opacity-60" />
                  {example.zh}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 底部提示 */}
        <div className="text-center text-xs text-gray-500 pt-2">
          💡 这是一个常用的动词短语（Phrasal Verb）
        </div>
      </div>
    </div>
  )
}
