'use client'

import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Settings, Minimize, SkipBack, SkipForward, Repeat, Repeat1, Clock } from 'lucide-react'
import type { SubtitleEntry } from './SubtitlePanel'

interface VideoPlayerProps {
  src: string
  subtitles?: Array<{
    id: string
    language: string
    content: string
  }>
  parsedSubtitles?: SubtitleEntry[]
  onTimeUpdate?: (time: number) => void
  onSubtitleChange?: (subtitle: SubtitleEntry | null) => void
  playbackRate?: number
  onPlaybackRateChange?: (rate: number) => void
  loopMode?: 'none' | 'all' | 'ab'
  onLoopModeChange?: (mode: 'none' | 'all' | 'ab') => void
  hideControls?: boolean
  showBasicControls?: boolean
}

export interface VideoPlayerRef {
  videoRef: React.RefObject<HTMLVideoElement>
  getCurrentTime: () => number
  seekTo: (time: number) => void
  play: () => void
  pause: () => void
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(function VideoPlayer({
  src,
  subtitles,
  parsedSubtitles,
  onTimeUpdate,
  onSubtitleChange,
  playbackRate: externalPlaybackRate,
  onPlaybackRateChange,
  loopMode: externalLoopMode,
  onLoopModeChange,
  hideControls = false,
  showBasicControls = false,
}, ref) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [internalPlaybackRate, setInternalPlaybackRate] = useState(1)
  const [internalLoopMode, setInternalLoopMode] = useState<'none' | 'all' | 'ab'>('none')

  // 使用外部props或内部状态
  const playbackRate = externalPlaybackRate ?? internalPlaybackRate
  const loopMode = externalLoopMode ?? internalLoopMode
  const [loopStart, setLoopStart] = useState<number | null>(null)
  const [loopEnd, setLoopEnd] = useState<number | null>(null)
  const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleEntry | null>(null)
  const [showControls, setShowControls] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [buffered, setBuffered] = useState(0)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [showLoopMenu, setShowLoopMenu] = useState(false)
  const [isVideoLoading, setIsVideoLoading] = useState(true)
  const [hasStartedLoading, setHasStartedLoading] = useState(false)
  const [lastSubtitleIndex, setLastSubtitleIndex] = useState(-1) // 缓存上次的字幕索引

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]

  // 使用二分查找优化字幕查找
  const findSubtitleIndex = useCallback((time: number) => {
    if (!parsedSubtitles || parsedSubtitles.length === 0) return -1

    // 从上次索引开始搜索（利用时间局部性）
    const lastIdx = lastSubtitleIndex
    if (lastIdx >= 0 && lastIdx < parsedSubtitles.length) {
      const lastSub = parsedSubtitles[lastIdx]
      if (time >= lastSub.startTime / 1000 && time <= lastSub.endTime / 1000) {
        return lastIdx
      }
      // 检查下一个字幕
      if (lastIdx + 1 < parsedSubtitles.length) {
        const nextSub = parsedSubtitles[lastIdx + 1]
        if (time >= nextSub.startTime / 1000 && time <= nextSub.endTime / 1000) {
          return lastIdx + 1
        }
      }
    }

    // 二分查找
    let left = 0
    let right = parsedSubtitles.length - 1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const sub = parsedSubtitles[mid]
      const start = sub.startTime / 1000
      const end = sub.endTime / 1000

      if (time >= start && time <= end) {
        return mid
      } else if (time < start) {
        right = mid - 1
      } else {
        left = mid + 1
      }
    }

    return -1
  }, [parsedSubtitles, lastSubtitleIndex])

  // 安全的播放函数，处理 AbortError
  const safePlay = async (video: HTMLVideoElement) => {
    try {
      await video.play()
      setPlaying(true)
      return true
    } catch (error) {
      // 忽略播放中断错误（通常是组件重新渲染导致的）
      if ((error as Error).name !== 'AbortError') {
        console.error('播放失败:', error)
      }
      return false
    }
  }

  // 暴露方法给父组件
  useImperativeHandle(
    ref,
    () => ({
      videoRef,
      getCurrentTime: () => videoRef.current?.currentTime || 0,
      seekTo: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time
        }
      },
      play: async () => {
        if (videoRef.current) {
          await safePlay(videoRef.current)
        }
      },
      pause: () => {
        videoRef.current?.pause()
        setPlaying(false)
      }
    }),
    [videoRef]
  )

  // 重置控制栏自动隐藏定时器
  const resetControlsTimer = useCallback(() => {
    // 不再自动隐藏，只在点击时切换
    // setShowControls(true)
    // if (playing) {
    //   controlsTimerRef.current = setTimeout(() => {
    //     setShowControls(false)
    //   }, 3000)
    // }
  }, [playing])

  // 切换控制栏显示
  const toggleControls = useCallback(() => {
    setShowControls(prev => !prev)
  }, [])

  // 查找当前字幕索引（使用优化的查找函数）
  const getCurrentSubtitleIndex = useCallback(() => {
    return findSubtitleIndex(currentTime)
  }, [findSubtitleIndex, currentTime])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      const time = video.currentTime
      setCurrentTime(time)
      onTimeUpdate?.(time)

      // 更新缓冲进度
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        setBuffered(bufferedEnd)
      }

      // 使用优化的查找函数查找当前字幕
      if (parsedSubtitles && parsedSubtitles.length > 0) {
        const subtitleIdx = findSubtitleIndex(time)

        // 只在字幕变化时更新
        if (subtitleIdx !== lastSubtitleIndex) {
          setLastSubtitleIndex(subtitleIdx)
          if (subtitleIdx !== -1) {
            const subtitle = parsedSubtitles[subtitleIdx]
            if (subtitle !== currentSubtitle) {
              setCurrentSubtitle(subtitle)
              onSubtitleChange?.(subtitle)
            }
          }
        }
      }

      // AB 循环逻辑
      if (loopMode === 'ab' && loopStart !== null && loopEnd !== null) {
        if (time >= loopEnd) {
          video.currentTime = loopStart
        }
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setIsVideoLoading(false)
    }

    const handleCanPlay = () => {
      setIsVideoLoading(false)
    }

    const handleEnded = async () => {
      if (loopMode === 'all') {
        video.currentTime = 0
        await safePlay(video)
      } else {
        setPlaying(false)
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('ended', handleEnded)
    }
  }, [loopMode, loopStart, loopEnd, onTimeUpdate, findSubtitleIndex, lastSubtitleIndex, onSubtitleChange, currentSubtitle])

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果在输入框中，不处理快捷键
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, currentTime - 5)
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(duration, currentTime + 5)
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume(v => Math.min(1, v + 0.1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume(v => Math.max(0, v - 0.1))
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
        case '<':
        case ',':
          e.preventDefault()
          const currentSpeedIndex = speeds.indexOf(playbackRate)
          if (currentSpeedIndex > 0) {
            changePlaybackRate(speeds[currentSpeedIndex - 1])
          }
          break
        case '>':
        case '.':
          e.preventDefault()
          const nextSpeedIndex = speeds.indexOf(playbackRate)
          if (nextSpeedIndex < speeds.length - 1) {
            changePlaybackRate(speeds[nextSpeedIndex + 1])
          }
          break
        case 'n':
          e.preventDefault()
          goToNextSubtitle()
          break
        case 'p':
          e.preventDefault()
          goToPreviousSubtitle()
          break
        case 'r':
          e.preventDefault()
          replayCurrentSubtitle()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentTime, duration, playbackRate, playing, loopMode, loopStart, parsedSubtitles, currentSubtitle])

  const togglePlay = async () => {
    const video = videoRef.current
    if (!video) return

    if (playing) {
      video.pause()
      setPlaying(false)
    } else {
      try {
        await video.play()
        setPlaying(true)
      } catch (error) {
        // 忽略播放中断错误（通常是组件重新渲染导致的）
        if ((error as Error).name !== 'AbortError') {
          console.error('播放失败:', error)
        }
      }
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const time = parseFloat(e.target.value)
    video.currentTime = time
    setCurrentTime(time)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const newVolume = parseFloat(e.target.value)
    video.volume = newVolume
    setVolume(newVolume)
    setMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    if (muted) {
      video.volume = volume || 1
      setMuted(false)
    } else {
      video.volume = 0
      setMuted(true)
    }
  }

  // 字幕导航功能
  const goToPreviousSubtitle = async () => {
    const currentIndex = getCurrentSubtitleIndex()
    if (!parsedSubtitles || currentIndex <= 0) return

    const previousSubtitle = parsedSubtitles[currentIndex - 1]
    if (previousSubtitle && videoRef.current) {
      videoRef.current.currentTime = previousSubtitle.startTime / 1000
      if (!playing) {
        await safePlay(videoRef.current)
      }
    }
  }

  const goToNextSubtitle = async () => {
    const currentIndex = getCurrentSubtitleIndex()
    if (!parsedSubtitles || currentIndex === -1 || currentIndex >= parsedSubtitles.length - 1) return

    const nextSubtitle = parsedSubtitles[currentIndex + 1]
    if (nextSubtitle && videoRef.current) {
      videoRef.current.currentTime = nextSubtitle.startTime / 1000
      if (!playing) {
        await safePlay(videoRef.current)
      }
    }
  }

  const replayCurrentSubtitle = async () => {
    if (!currentSubtitle || !videoRef.current) return

    videoRef.current.currentTime = currentSubtitle.startTime / 1000
    if (!playing) {
      await safePlay(videoRef.current)
    }
  }

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current
    if (!video) return

    video.playbackRate = rate
    if (onPlaybackRateChange) {
      onPlaybackRateChange(rate)
    } else {
      setInternalPlaybackRate(rate)
    }
  }

  const updateLoopMode = (mode: 'none' | 'all' | 'ab') => {
    if (onLoopModeChange) {
      onLoopModeChange(mode)
    } else {
      setInternalLoopMode(mode)
    }
  }

  const toggleLoop = () => {
    const video = videoRef.current
    if (!video) return

    if (loopMode === 'none') {
      updateLoopMode('all')
    } else if (loopMode === 'all') {
      updateLoopMode('ab')
      setLoopStart(currentTime)
      setLoopEnd(null)
    } else if (loopMode === 'ab') {
      updateLoopMode('none')
      setLoopStart(null)
      setLoopEnd(null)
    } else {
      updateLoopMode('none')
      setLoopStart(null)
      setLoopEnd(null)
    }
  }

  const setABLoopEnd = () => {
    if (loopMode === 'ab' && loopStart !== null) {
      setLoopEnd(currentTime)
    }
  }

  const setABLoopStart = () => {
    updateLoopMode('ab')
    setLoopStart(currentTime)
    setLoopEnd(null)
  }

  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    } else {
      container.requestFullscreen()
      setIsFullscreen(true)
    }
  }

  const togglePageFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    if (!isFullscreen) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {/* 视频播放器 */}
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden group bg-black aspect-video"
        onClick={toggleControls}
      >
        <video
          ref={videoRef}
          src={src}
          preload="metadata"
          className="w-full h-full object-contain"
          onClick={(e) => {
            e.stopPropagation() // 阻止事件冒泡到容器
            togglePlay()
          }}
          onError={(e) => {
            console.error('[VideoPlayer] Video load error:', e)
            console.error('[VideoPlayer] Video src:', src)
            setIsVideoLoading(false)
          }}
          onLoadStart={() => {
            console.log('[VideoPlayer] Video load start:', src)
            setHasStartedLoading(true)
          }}
          onWaiting={() => {
            setIsVideoLoading(true)
          }}
          onPlaying={() => {
            setIsVideoLoading(false)
          }}
        />

        {/* 加载指示器 */}
        {isVideoLoading && hasStartedLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin"></div>
              <p className="text-white text-sm">视频加载中...</p>
            </div>
          </div>
        )}

        {/* 浮动控制栏 */}
        {(!hideControls || showBasicControls) && (
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-all duration-300 ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()} // 防止点击控制栏时触发容器的点击事件
        >
          {/* 进度条 */}
          <div className="mb-3 relative">
            {/* 播放进度条 */}
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="relative w-full bg-transparent appearance-none cursor-pointer video-progress-slider"
              style={{
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(currentTime / duration) * 100}%, #4B5563 ${(currentTime / duration) * 100}%, #4B5563 100%)`
              }}
            />
            {/* 预览时间提示 */}
            <div className="absolute -top-6 transform -translate-x-1/2 text-xs text-white bg-black/80 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {formatTime(currentTime)}
            </div>
          </div>

          {/* 控制按钮行 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* 播放/暂停 */}
              <button
                onClick={togglePlay}
                className="p-2 text-white hover:text-accent transition-all hover:scale-110"
                title="播放/暂停 (空格或K)"
              >
                {playing ? <Pause size={24} /> : <Play size={24} />}
              </button>

              {/* 音量 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-2 text-white hover:text-accent transition-all hover:scale-110"
                  title="静音 (M)"
                >
                  {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-12 h-1 rounded-full appearance-none cursor-pointer video-volume-slider"
                  title="音量 (↑/↓)"
                />
              </div>

              {/* 时间显示 */}
              <div className="text-white text-sm font-medium tabular-nums">
                {formatTime(currentTime)} <span className="text-gray-400">/</span> {formatTime(duration)}
              </div>

              {/* 当前倍速指示 */}
              <div className="text-xs text-accent bg-accent/10 px-2 py-1 rounded font-medium">
                {playbackRate}x
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 循环模式指示 */}
              {loopMode !== 'none' && (
                <div className="text-xs text-accent bg-accent/10 px-2 py-1 rounded flex items-center gap-1">
                  {loopMode === 'all' ? <Repeat size={14} /> : <Repeat1 size={14} />}
                  <span>{loopMode === 'all' ? '全片' : '单句'}</span>
                </div>
              )}

              {/* 全屏按钮 */}
              <button
                onClick={toggleFullscreen}
                className="p-2 text-white hover:text-accent transition-all hover:scale-110"
                title="全屏 (F)"
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* 暂停时的中央播放按钮 */}
        {!hideControls && !playing && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
          >
            <div className="w-16 h-16 rounded-full bg-accent/90 flex items-center justify-center hover:bg-accent transition-all hover:scale-110">
              <Play size={32} className="text-white ml-1" />
            </div>
          </button>
        )}
      </div>

      {/* 外部控制面板 - 紧凑布局 */}
      {!hideControls && (
      <div className="bg-surface-light rounded-xl p-3 sm:p-4">
        {/* 所有控制项并排成一行 */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* 字幕导航 */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 uppercase tracking-wide">字幕</span>
            <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousSubtitle}
                className="flex items-center gap-1 px-2 py-1.5 bg-surface text-gray-300 rounded-lg hover:bg-surface-light hover:text-accent transition-all active:scale-95"
                title="上一句 (P)"
              >
                <SkipBack size={14} />
              </button>

              <button
                onClick={replayCurrentSubtitle}
                className="flex items-center gap-1 px-2 py-1.5 bg-surface text-gray-300 rounded-lg hover:bg-surface-light hover:text-accent transition-all active:scale-95"
                title="重播当前句 (R)"
              >
                <RotateCcw size={14} />
              </button>

              <button
                onClick={goToNextSubtitle}
                className="flex items-center gap-1 px-2 py-1.5 bg-surface text-gray-300 rounded-lg hover:bg-surface-light hover:text-accent transition-all active:scale-95"
                title="下一句 (N)"
              >
                <SkipForward size={14} />
              </button>
            </div>
          </div>

          {/* 分隔符 */}
          <div className="hidden sm:block h-6 w-px bg-gray-700"></div>

          {/* 倍速控制 */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">速度</span>
            <div className="flex items-center gap-1 bg-surface rounded-lg p-1">
              {speeds.map((speed) => (
                <button
                  key={speed}
                  onClick={() => changePlaybackRate(speed)}
                  className={`px-2 py-1 text-sm rounded-md transition-all ${
                    playbackRate === speed
                      ? 'bg-accent text-white font-medium shadow-lg'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-surface-light'
                  }`}
                  title={`${speed}x 速度`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* 分隔符 */}
          <div className="hidden sm:block h-6 w-px bg-gray-700"></div>

          {/* 循环模式控制 */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">循环</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  updateLoopMode('none')
                  setLoopStart(null)
                  setLoopEnd(null)
                }}
                className={`px-2 py-1 text-sm rounded-md transition-all ${
                  loopMode === 'none'
                    ? 'bg-accent text-white font-medium'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-surface-light'
                }`}
              >
                关
              </button>

              <button
                onClick={() => updateLoopMode('all')}
                className={`px-2 py-1 text-sm rounded-md transition-all flex items-center gap-1 ${
                  loopMode === 'all'
                    ? 'bg-accent text-white font-medium'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-surface-light'
                }`}
              >
                <Repeat size={12} />
                全片
              </button>

              <button
                onClick={setABLoopStart}
                className={`px-2 py-1 text-sm rounded-md transition-all flex items-center gap-1 ${
                  loopMode === 'ab' && loopStart !== null && loopEnd === null
                    ? 'bg-accent text-white font-medium'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-surface-light'
                }`}
              >
                <Repeat1 size={12} />
                AB段
              </button>

              {/* AB循环设置按钮 */}
              {loopMode === 'ab' && loopStart !== null && loopEnd === null && (
                <button
                  onClick={setABLoopEnd}
                  className="px-2 py-1 text-sm rounded-md bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-all font-medium animate-pulse"
                >
                  设置终点
                </button>
              )}

              {/* 循环提示 */}
              {loopMode === 'ab' && loopStart !== null && loopEnd !== null && (
                <div className="flex items-center gap-1 text-xs text-accent bg-accent/10 px-2 py-1 rounded">
                  <Clock size={10} />
                  <span className="font-mono">{formatTime(loopStart)}-{formatTime(loopEnd)}</span>
                </div>
              )}
            </div>
          </div>

          {/* 键盘快捷键提示 - 仅在大屏幕显示 */}
          <div className="hidden xl:flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-surface rounded text-gray-400">空格</kbd>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-surface rounded text-gray-400">F</kbd>
            </span>
          </div>
        </div>

        {/* AB循环控制按钮 */}
        {loopMode === 'ab' && loopStart !== null && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
            <button
              onClick={() => {
                if (loopStart !== null) {
                  videoRef.current!.currentTime = loopStart
                }
              }}
              className="px-3 py-1.5 text-sm bg-surface text-gray-300 rounded-lg hover:bg-surface-light hover:text-accent transition-all"
            >
              跳到起点 ({formatTime(loopStart)})
            </button>
            <button
              onClick={() => {
                updateLoopMode('none')
                setLoopStart(null)
                setLoopEnd(null)
              }}
              className="px-3 py-1.5 text-sm bg-surface text-gray-300 rounded-lg hover:bg-surface-light hover:text-red-400 transition-all"
            >
              取消循环
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  )
})
