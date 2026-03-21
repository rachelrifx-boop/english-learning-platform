'use client'

import { useState, useEffect, useRef } from 'react'
import { PenTool, X, Play, RotateCw, Check, ArrowRight, Volume2, Eye, EyeOff } from 'lucide-react'

export interface SubtitleEntry {
  id: number
  startTime: number
  endTime: number
  text: {
    en: string
    zh: string
  }
}

interface DictationPanelProps {
  subtitle: SubtitleEntry
  allSubtitles: SubtitleEntry[]
  onClose: () => void
  onNextSentence?: (nextSubtitle: SubtitleEntry) => void
}

interface WordResult {
  word: string
  isCorrect: boolean
  userWord?: string
}

export function DictationPanel({ subtitle, allSubtitles, onClose, onNextSentence }: DictationPanelProps) {
  // 正确答案（清理标点符号）
  const correctWords = subtitle.text.en
    .replace(/[.,!?;:"'()]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0)

  const [userInput, setUserInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [wordResults, setWordResults] = useState<WordResult[]>([])
  const [score, setScore] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSubtitle, setCurrentSubtitle] = useState(subtitle)
  const [showHint, setShowHint] = useState(false)
  const currentSubtitleRef = useRef(subtitle)  // 使用 ref 存储最新的 subtitle

  // 保持 ref 与 state 同步
  useEffect(() => {
    currentSubtitleRef.current = currentSubtitle
  }, [currentSubtitle])

  const videoRef = useRef<HTMLVideoElement | null>(null)

  // 隐藏视频字幕
  useEffect(() => {
    const video = document.querySelector('video') as HTMLVideoElement
    if (video && video.textTracks) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'hidden'
      }
    }

    // 组件卸载时恢复字幕显示
    return () => {
      const video = document.querySelector('video') as HTMLVideoElement
      if (video && video.textTracks) {
        for (let i = 0; i < video.textTracks.length; i++) {
          video.textTracks[i].mode = 'showing'
        }
      }
    }
  }, [])

  // 自动播放一次
  useEffect(() => {
    playSentence(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 播放句子
  const playSentence = (rate: number = 1) => {
    const video = document.querySelector('video') as HTMLVideoElement
    if (!video) return

    videoRef.current = video
    // 使用 ref 获取最新的 subtitle
    const current = currentSubtitleRef.current
    const startTime = current.startTime / 1000
    const endTime = current.endTime / 1000

    video.currentTime = startTime
    video.playbackRate = rate
    video.play()

    setIsPlaying(true)

    // 监听播放结束
    const handleTimeUpdate = () => {
      if (video.currentTime >= endTime) {
        video.pause()
        video.playbackRate = 1
        setIsPlaying(false)
        video.removeEventListener('timeupdate', handleTimeUpdate)
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
  }

  // 提交答案
  const handleSubmit = () => {
    const userWords = userInput
      .replace(/[.,!?;:"'()]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 0)
      .map(w => w ? w.toLowerCase() : '')

    const results: WordResult[] = []
    let correctCount = 0

    correctWords.forEach((word, index) => {
      const userWord = userWords[index] ? userWords[index].toLowerCase() : ''
      const isCorrect = userWord === (word ? word.toLowerCase() : '')

      if (isCorrect) correctCount++

      results.push({
        word,
        isCorrect,
        userWord: userWords[index]
      })
    })

    // 检查用户是否输入了额外单词
    if (userWords.length > correctWords.length) {
      for (let i = correctWords.length; i < userWords.length; i++) {
        results.push({
          word: '',
          isCorrect: false,
          userWord: userWords[i]
        })
      }
    }

    setWordResults(results)
    setScore(Math.round((correctCount / correctWords.length) * 100))
    setSubmitted(true)
  }

  // 下一句
  const handleNext = () => {
    if (!allSubtitles || allSubtitles.length === 0) return

    const currentIndex = allSubtitles.findIndex(s => s.id === currentSubtitle.id)
    const nextIndex = currentIndex + 1

    if (nextIndex < allSubtitles.length) {
      const next = allSubtitles[nextIndex]

      // 立即更新 ref，这样 playSentence 可以立即使用新的 subtitle
      currentSubtitleRef.current = next

      setCurrentSubtitle(next)
      setUserInput('')
      setSubmitted(false)
      setWordResults([])
      setScore(0)
      setShowHint(false) // 隐藏提示
      onNextSentence?.(next)

      // 立即播放下一句（ref 已更新）
      setTimeout(() => playSentence(1), 100)
    } else {
      onClose()
    }
  }

  // 重新开始
  const handleRestart = () => {
    setUserInput('')
    setSubmitted(false)
    setWordResults([])
    setScore(0)
    setShowHint(false) // 隐藏提示
  }

  return (
    <div className="bg-surface rounded-xl p-4 space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-accent">
          <PenTool size={20} />
          <span className="font-semibold">听写模式</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* 输入区域 */}
      {!submitted ? (
        <div className="space-y-3">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="输入你听到的英文内容..."
            className="w-full bg-surface-light border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
            rows={3}
            autoFocus
          />

          {/* 单词数量提示和提示按钮 */}
          <div className="flex items-center justify-between">
            <div className="text-gray-500 text-xs">
              提示：{correctWords.length} 个单词
            </div>
            <button
              onClick={() => setShowHint(!showHint)}
              className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
            >
              {showHint ? (
                <>
                  <EyeOff size={14} />
                  隐藏提示
                </>
              ) : (
                <>
                  <Eye size={14} />
                  显示提示
                </>
              )}
            </button>
          </div>

          {/* 提示内容 */}
          {showHint && (
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 space-y-2">
              <div className="text-sm">
                <span className="text-gray-400">完整句子：</span>
                <span className="text-white ml-2">{subtitle.text.en}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">中文翻译：</span>
                <span className="text-white ml-2">{subtitle.text.zh}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">单词列表：</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {correctWords.map((word, index) => (
                    <span key={index} className="px-2 py-0.5 bg-accent/20 text-accent rounded text-xs">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 结果展示 */
        <div className="space-y-3">
          {/* 得分 */}
          <div className="flex items-center justify-between bg-surface rounded-lg p-3">
            <span className="text-gray-400">正确率</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className={`text-lg font-bold ${
                score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {score}%
              </span>
            </div>
          </div>

          {/* 单词对比 */}
          <div className="bg-surface-light rounded-lg p-3">
            <div className="flex flex-wrap gap-2">
              {wordResults.map((result, index) => (
                <span
                  key={index}
                  className={`px-2 py-1 rounded ${
                    result.isCorrect
                      ? 'bg-green-500/20 text-green-400'
                      : result.word
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-red-500/10 text-red-300'
                  }`}
                >
                  {result.isCorrect ? result.word : (
                    <>
                      <span className="line-through opacity-50">{result.userWord || '___'}</span>
                      <span className="ml-1">{result.word}</span>
                    </>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 控制按钮 */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {!submitted ? (
            <>
              {/* 再听一次 */}
              <button
                onClick={() => playSentence(1)}
                disabled={isPlaying}
                className="flex-1 py-2 bg-surface hover:bg-surface-light text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Volume2 size={18} />
                再听一次
              </button>

              {/* 慢速再听 */}
              <button
                onClick={() => playSentence(0.75)}
                disabled={isPlaying}
                className="flex-1 py-2 bg-surface hover:bg-surface-light text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RotateCw size={18} />
                慢速再听
              </button>
            </>
          ) : (
            <>
              {/* 重新开始 */}
              <button
                onClick={handleRestart}
                className="flex-1 py-2 bg-surface hover:bg-surface-light text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RotateCw size={18} />
                重新开始
              </button>

              {/* 下一句 */}
              <button
                onClick={handleNext}
                className="flex-1 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                下一句
                <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>

        {!submitted && (
          /* 提交按钮 */
          <button
            onClick={handleSubmit}
            disabled={!userInput.trim()}
            className="w-full py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={18} />
            提交答案
          </button>
        )}
      </div>

      {/* 当前句子序号 */}
      <div className="text-center text-gray-500 text-xs">
        句子 {allSubtitles && allSubtitles.length > 0 ? allSubtitles.findIndex(s => s.id === currentSubtitle.id) + 1 : 0} / {allSubtitles?.length || 0}
      </div>
    </div>
  )
}
