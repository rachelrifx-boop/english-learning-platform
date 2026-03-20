'use client'

import { useState, useEffect, useRef } from 'react'
import { Headphones, X, Play, Pause, RotateCw } from 'lucide-react'

export interface SubtitleEntry {
  id: number
  startTime: number
  endTime: number
  text: {
    en: string
    zh: string
  }
}

interface IntensiveListeningPanelProps {
  subtitle: SubtitleEntry
  onClose: () => void
  onComplete?: () => void
}

export function IntensiveListeningPanel({ subtitle, onClose, onComplete }: IntensiveListeningPanelProps) {
  // 从 localStorage 读取保存的设置，如果没有则使用默认值
  const getSavedSettings = () => {
    if (typeof window === 'undefined') return { pauseDuration: 5, playbackRate: 1, maxLoops: 0 }
    const saved = localStorage.getItem('intensive-listening-settings')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return { pauseDuration: 5, playbackRate: 1, maxLoops: 0 }
      }
    }
    return { pauseDuration: 5, playbackRate: 1, maxLoops: 0 }
  }

  const savedSettings = getSavedSettings()

  // 精听设置
  const [playbackRate, setPlaybackRate] = useState(savedSettings.playbackRate)  // 倍速
  const [pauseDuration, setPauseDuration] = useState(savedSettings.pauseDuration)  // 间隔时间（秒）
  const [maxLoops, setMaxLoops] = useState(savedSettings.maxLoops)  // 循环次数，0表示无限循环

  // 播放状态
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentLoop, setCurrentLoop] = useState(0)
  const [countdown, setCountdown] = useState(0)  // 暂停倒计时
  const [status, setStatus] = useState<'playing' | 'paused' | 'countdown'>('playing')

  // 保存设置到 localStorage
  const saveSettings = (rate: number, duration: number, loops: number) => {
    if (typeof window === 'undefined') return
    localStorage.setItem('intensive-listening-settings', JSON.stringify({
      playbackRate: rate,
      pauseDuration: duration,
      maxLoops: loops
    }))
  }

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const startTime = subtitle.startTime / 1000
  const endTime = subtitle.endTime / 1000
  const duration = endTime - startTime

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  // 当设置改变时保存到 localStorage
  useEffect(() => {
    saveSettings(playbackRate, pauseDuration, maxLoops)
  }, [playbackRate, pauseDuration, maxLoops])

  // 开始精听
  const startListening = () => {
    const video = document.querySelector('video') as HTMLVideoElement
    if (!video) return

    videoRef.current = video
    video.playbackRate = playbackRate

    // 跳转到起始位置
    video.currentTime = startTime

    setIsPlaying(true)
    setStatus('playing')
    setCurrentLoop(0)

    // 开始播放
    video.play()

    // 监听播放进度
    const checkTime = () => {
      if (video.currentTime >= endTime) {
        // 到达结束位置，开始暂停
        video.pause()
        setIsPlaying(false)
        setStatus('countdown')
        startCountdown()
      } else {
        intervalRef.current = setTimeout(checkTime, 100)
      }
    }

    intervalRef.current = setTimeout(checkTime, 100)
  }

  // 开始倒计时
  const startCountdown = () => {
    setCountdown(pauseDuration)

    const tick = () => {
      setCountdown(prev => {
        if (prev <= 1) {
          // 倒计时结束，开始下一轮循环
          if (maxLoops === 0 || currentLoop < maxLoops - 1) {
            setCurrentLoop(prev => prev + 1)
            startListening()
          } else {
            // 达到循环次数上限
            handleComplete()
          }
          return 0
        }
        timeoutRef.current = setTimeout(tick, 1000)
        return prev - 1
      })
    }

    timeoutRef.current = setTimeout(tick, 1000)
  }

  // 停止精听
  const stopListening = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    const video = videoRef.current
    if (video) {
      video.pause()
      video.playbackRate = 1
    }

    setIsPlaying(false)
    setStatus('playing')
    setCountdown(0)
  }

  // 完成精听
  const handleComplete = () => {
    stopListening()
    onComplete?.()
    onClose()
  }

  // 暂停/继续
  const togglePause = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
      setIsPlaying(false)
      setStatus('paused')
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    } else {
      video.play()
      setIsPlaying(true)
      setStatus('playing')

      const checkTime = () => {
        if (video.currentTime >= endTime) {
          video.pause()
          setIsPlaying(false)
          setStatus('countdown')
          startCountdown()
        } else {
          intervalRef.current = setTimeout(checkTime, 100)
        }
      }

      intervalRef.current = setTimeout(checkTime, 100)
    }
  }

  // 自动开始
  useEffect(() => {
    startListening()
    // 组件卸载时停止
    return () => stopListening()
  }, [])

  // 倍速选项
  const rateOptions = [0.5, 0.75, 1, 1.25, 1.5]

  return (
    <div className="bg-surface rounded-xl p-4 space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-accent">
          <Headphones size={20} />
          <span className="font-semibold">精听模式</span>
        </div>
        <button
          onClick={handleComplete}
          className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* 当前句子 */}
      <div className="bg-[#4F8EF7]/10 border border-[#4F8EF7]/30 rounded-lg p-3">
        <p className="text-white text-base leading-relaxed">{subtitle.text.en}</p>
        <p className="text-gray-400 text-sm mt-1">{subtitle.text.zh}</p>
      </div>

      {/* 状态显示 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {status === 'playing' && (
            <span className="text-green-400 text-sm flex items-center gap-1">
              <Play size={14} fill="currentColor" />
              播放中
            </span>
          )}
          {status === 'paused' && (
            <span className="text-yellow-400 text-sm flex items-center gap-1">
              <Pause size={14} fill="currentColor" />
              已暂停
            </span>
          )}
          {status === 'countdown' && (
            <span className="text-blue-400 text-sm flex items-center gap-1">
              <RotateCw size={14} className="animate-spin" />
              等待中... {countdown}秒
            </span>
          )}
          {maxLoops > 0 && (
            <span className="text-gray-400 text-sm">
              第 {Math.min(currentLoop + 1, maxLoops)} / {maxLoops} 轮
            </span>
          )}
          {maxLoops === 0 && (
            <span className="text-gray-400 text-sm">
              第 {currentLoop + 1} 轮
            </span>
          )}
        </div>

        {/* 暂停/继续按钮 */}
        <button
          onClick={togglePause}
          className="p-2 bg-surface hover:bg-surface-light text-gray-300 rounded-lg transition-colors"
          title={isPlaying ? '暂停' : '继续'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
        </button>
      </div>

      {/* 控制选项 */}
      <div className="space-y-3">
        {/* 倍速选择 */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">播放倍速</span>
          <div className="flex gap-1">
            {rateOptions.map(rate => (
              <button
                key={rate}
                onClick={() => {
                  setPlaybackRate(rate)
                  const video = videoRef.current
                  if (video) video.playbackRate = rate
                }}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  playbackRate === rate
                    ? 'bg-accent text-white'
                    : 'bg-surface text-gray-300 hover:bg-surface-light'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* 间隔时间 */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">间隔时间</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="10"
              value={pauseDuration}
              onChange={(e) => setPauseDuration(Number(e.target.value))}
              className="w-24 accent-accent"
            />
            <span className="text-white text-sm w-12 text-center">{pauseDuration}秒</span>
          </div>
        </div>

        {/* 循环次数 */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">循环次数</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMaxLoops(Math.max(0, maxLoops - 1))}
              className="w-8 h-8 bg-surface hover:bg-surface-light text-gray-300 rounded flex items-center justify-center"
            >
              -
            </button>
            <span className="text-white text-sm w-16 text-center">
              {maxLoops === 0 ? '无限' : maxLoops}
            </span>
            <button
              onClick={() => setMaxLoops(maxLoops + 1)}
              className="w-8 h-8 bg-surface hover:bg-surface-light text-gray-300 rounded flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 停止按钮 */}
      <button
        onClick={handleComplete}
        className="w-full py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
      >
        <X size={18} />
        停止精听
      </button>
    </div>
  )
}
