'use client'

import { useEffect, useState } from 'react'
import { Volume2, Loader } from 'lucide-react'
import { getQuickSentencePhonetics, SentencePhonetics } from '@/lib/phonetics'

interface SentencePhoneticsProps {
  sentence: string
  onPlay?: () => void
}

export function SentencePhoneticsDisplay({ sentence, onPlay }: SentencePhoneticsProps) {
  const [phonetics, setPhonetics] = useState<SentencePhonetics | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPhonetics, setShowPhonetics] = useState(false)

  useEffect(() => {
    if (sentence && showPhonetics) {
      setLoading(true)
      // 使用快速本地音标生成
      const result = getQuickSentencePhonetics(sentence)
      setPhonetics(result)
      setLoading(false)
    }
  }, [sentence, showPhonetics])

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(sentence)
      utterance.lang = 'en-US'
      utterance.rate = 0.8  // 稍慢一点的语速
      speechSynthesis.speak(utterance)
      onPlay?.()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowPhonetics(!showPhonetics)}
          className="text-xs text-accent hover:text-accent2 transition-colors underline"
        >
          {showPhonetics ? '隐藏' : '显示'}音标
        </button>

        <button
          onClick={handleSpeak}
          className="p-1 text-gray-400 hover:text-accent transition-colors rounded"
          title="朗读句子"
        >
          <Volume2 size={14} />
        </button>
      </div>

      {showPhonetics && (
        <div className="bg-surface rounded-lg p-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader size={14} className="animate-spin" />
              加载音标中...
            </div>
          ) : phonetics ? (
            <div className="flex flex-wrap gap-2 text-xs">
              {phonetics.words.map((wp, idx) => (
                wp.ipa && (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-accent/10 text-accent rounded font-mono"
                    title={wp.word}
                  >
                    {wp.ipa}
                  </span>
                )
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">暂无音标数据</p>
          )}
        </div>
      )}
    </div>
  )
}

