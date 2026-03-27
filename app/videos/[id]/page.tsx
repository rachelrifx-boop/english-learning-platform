'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { VideoPlayer, VideoPlayerRef } from '@/components/VideoPlayer'
import { SubtitlePanel, SubtitleEntry } from '@/components/SubtitlePanel'
import { SubtitleWordHighlight } from '@/components/SubtitleWordHighlight'
import { VoiceRecorder } from '@/components/VoiceRecorder'
import { ExpressionCard } from '@/components/ExpressionCard'
import { SentencePhoneticsDisplay } from '@/components/SentencePhonetics'
import { ColorHighlight } from '@/components/ColorHighlight'
import { ClickableWordHighlight } from '@/components/WordDefinitionPopup'
import { WordCard, DictionaryEntry } from '@/components/WordCard'
import { ArrowLeft, Clock, BookOpen, Printer, Mic, Star, Repeat, Repeat1, FileText, Book, Volume2, PenTool, Languages, Brain, Eye, EyeOff, Plus, Minus, Headphones, CreditCard, ChevronDown, Play, Pause, SkipBack, SkipForward } from 'lucide-react'

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

type SubtitleMode = 'bilingual' | 'en' | 'zh'

export default function VideoPage() {
  const params = useParams()
  const router = useRouter()
  const videoId = params.id as string

  const [video, setVideo] = useState<any>(null)
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set())
  const [savedExpressions, setSavedExpressions] = useState<Map<string, { id: string; text: string }>>(new Map())
  const [showExpressionCard, setShowExpressionCard] = useState(false)
  const [showRecorder, setShowRecorder] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleEntry | null>(null)
  const [user, setUser] = useState<any>(null)
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>('bilingual')
  const [noteText, setNoteText] = useState('')
  const [notes, setNotes] = useState<Array<{ id: string; text: string; timestamp: number; subtitleText: string }>>([])
  const [videoTitleTranslation, setVideoTitleTranslation] = useState('')
  const [showPhonetics, setShowPhonetics] = useState(false)
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [showWordCard, setShowWordCard] = useState(false)
  const [dictionaryEntry, setDictionaryEntry] = useState<DictionaryEntry | null>(null)
  const [loadingDict, setLoadingDict] = useState(false)
  const [isVideoVisible, setIsVideoVisible] = useState(true)
  const [subtitleFontSize, setSubtitleFontSize] = useState(16)
  const [pauseAfterSubtitle, setPauseAfterSubtitle] = useState<number | null>(null)
  const [isFavorited, setIsFavorited] = useState(false)
  const [playingSubtitleId, setPlayingSubtitleId] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [loopMode, setLoopMode] = useState<'none' | 'all' | 'ab'>('none')
  const [mobileFunctionMode, setMobileFunctionMode] = useState<'none' | 'follow' | 'dictation'>('none')
  const [showSubtitleDropdown, setShowSubtitleDropdown] = useState(false)
  const [showSpeedDropdown, setShowSpeedDropdown] = useState(false)
  const activeSubtitleRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const speedDropdownRef = useRef<HTMLDivElement>(null)
  const videoPlayerRef = useRef<VideoPlayerRef>(null)
  const mobileVideoPlayerRef = useRef<VideoPlayerRef>(null)

  // 学习进度跟踪
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now())
  const [sessionWatchDuration, setSessionWatchDuration] = useState<number>(0)
  const [lastSavedPosition, setLastSavedPosition] = useState<number>(0)
  const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null)

  // 从 localStorage 读取视频可见性设置
  useEffect(() => {
    const saved = localStorage.getItem(`video-visible-${videoId}`)
    if (saved !== null) {
      setIsVideoVisible(saved === 'true')
    }
  }, [videoId])

  // 保存视频可见性设置到 localStorage
  const toggleVideoVisibility = () => {
    const newValue = !isVideoVisible
    setIsVideoVisible(newValue)
    localStorage.setItem(`video-visible-${videoId}`, String(newValue))
  }

  useEffect(() => {
    fetchVideo()
    fetchUser()
    fetchNotes()
    checkFavorite()
  }, [videoId])

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSubtitleDropdown(false)
      }
      if (speedDropdownRef.current && !speedDropdownRef.current.contains(event.target as Node)) {
        setShowSpeedDropdown(false)
      }
    }

    if (showSubtitleDropdown || showSpeedDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSubtitleDropdown, showSpeedDropdown])

  // 定期更新学习进度（每30秒）
  useEffect(() => {
    if (!user || !video) return

    progressUpdateInterval.current = setInterval(() => {
      updateProgress()
    }, 30000) // 每30秒更新一次

    return () => {
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current)
      }
    }
  }, [user, video, currentTime, sessionWatchDuration])

  // 页面卸载时保存进度
  useEffect(() => {
    return () => {
      if (sessionWatchDuration > 0) {
        updateProgress()
      }
    }
  }, [sessionWatchDuration])

  const fetchVideo = async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}`)
      const data = await response.json()

      if (data.success) {
        setVideo(data.data.video)

        // 翻译视频标题
        if (data.data.video.title) {
          fetchTranslation(data.data.video.title).then(setVideoTitleTranslation)
        }

        // 合并中英文字幕 - 只保留有英文字幕的条目
        const enSubtitle = data.data.video.subtitles?.find((s: any) => s.language === 'EN')
        const zhSubtitle = data.data.video.subtitles?.find((s: any) => s.language === 'ZH')

        if (enSubtitle && Array.isArray(enSubtitle.content)) {
          // 处理混合格式的字幕（有些是对象，有些是字符串）
          const processed = enSubtitle.content
            .filter((s: any) => s.text && (typeof s.text === 'object' || (typeof s.text === 'string' && s.text.trim())))
            .map((enSub: any) => {
              // 如果已经是新格式（对象），直接使用
              if (typeof enSub.text === 'object') {
                return enSub
              }

              // 如果是旧格式（字符串），需要合并中文字幕
              const zhSub = zhSubtitle?.content?.find((z: any) =>
                Math.abs(z.startTime - enSub.startTime) < 500
              )

              // 清理HTML标签
              let cleanEnText = enSub.text
              if (typeof cleanEnText === 'string') {
                cleanEnText = cleanEnText.replace(/<[^>]*>/g, '') // 移除HTML标签
              }

              return {
                ...enSub,
                text: {
                  en: cleanEnText,
                  zh: zhSub?.text || ''
                }
              }
            })
          setSubtitles(processed)
        } else {
          setSubtitles([])
        }
      }
    } catch (error) {
      console.error('获取视频失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTranslation = async (text: string) => {
    try {
      const response = await fetch(`/api/translate?text=${encodeURIComponent(text)}&source=en&target=zh`)
      const data = await response.json()
      if (data.success && data.data.translatedText) {
        console.log('翻译结果:', data.data.translatedText)
        return data.data.translatedText
      }
    } catch (error) {
      console.error('翻译失败:', error)
    }
    // 备用翻译：简单的标题映射
    const fallbackTranslations: Record<string, string> = {
      'A Week in My Life Vlog - Sydney Serena': '悉尼·塞雷娜一周生活视频博客'
    }
    return fallbackTranslations[text] || ''
  }

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.data.user)
        setIsAdmin(data.data.user.role === 'ADMIN')
        await fetchSavedWords(data.data.user.id)
        await fetchSavedExpressions(data.data.user.id)
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }

  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/notes?videoId=${videoId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data?.notes && Array.isArray(data.data.notes)) {
          setNotes(data.data.notes)
        }
      }
    } catch (error) {
      console.error('获取笔记失败:', error)
    }
  }

  const fetchSavedWords = async (userId: string) => {
    try {
      const response = await fetch('/api/words')
      const data = await response.json()
      if (data.success && data.data?.words && Array.isArray(data.data.words)) {
        const words = new Set<string>(
          data.data.words
            .filter((w: any) => w.word)  // 过滤掉 word 为 null/undefined 的记录
            .map((w: any) => w.word.toLowerCase())
        )
        setSavedWords(words)
      }
    } catch (error) {
      console.error('获取单词本失败:', error)
    }
  }

  const fetchSavedExpressions = async (userId: string) => {
    try {
      const response = await fetch(`/api/expressions?videoId=${videoId}`)
      const data = await response.json()
      if (data.success && data.data?.expressions && Array.isArray(data.data.expressions)) {
        const expressionsMap = new Map<string, { id: string; text: string }>()
        data.data.expressions.forEach((e: any) => {
          expressionsMap.set(e.text, { id: e.id, text: e.text })
        })
        setSavedExpressions(expressionsMap)
      }
    } catch (error) {
      console.error('获取表达卡片失败:', error)
    }
  }

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time)

    // 更新学习进度
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateTime

    // 累计观看时长（每秒更新一次）
    if (timeSinceLastUpdate >= 1000) {
      setSessionWatchDuration(prev => prev + 1)
      setLastUpdateTime(now)
    }

    // 检查是否需要在当前字幕后暂停
    if (pauseAfterSubtitle !== null) {
      // 如果已经超出设定的暂停时间，暂停视频
      if (time >= pauseAfterSubtitle / 1000) {
        // 暂停所有视频
        const pauseAllVideos = () => {
          if (videoPlayerRef.current) videoPlayerRef.current.pause()
          if (mobileVideoPlayerRef.current) mobileVideoPlayerRef.current.pause()
        }
        pauseAllVideos()
        setPauseAfterSubtitle(null) // 清除暂停标记
      }
    }
  }

  // 更新学习进度到服务器
  const updateProgress = async () => {
    if (!user || !video) return

    try {
      const watchDuration = sessionWatchDuration
      const position = currentTime

      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          position,
          watchDuration
        })
      })

      // 重置会话观看时长
      setSessionWatchDuration(0)
      setLastSavedPosition(position)
    } catch (error) {
      console.error('更新学习进度失败:', error)
    }
  }

  const handleSubtitleChange = (subtitle: SubtitleEntry | null) => {
    setCurrentSubtitle(subtitle)
  }

  const handleSubtitleClick = (subtitleId: number, time: number, shouldPlay = false, endTime?: number) => {
    // 获取当前活动的videoPlayerRef（桌面端或移动端）
    let playerRef: VideoPlayerRef | null | undefined = null
    if (videoPlayerRef.current?.videoRef.current) {
      playerRef = videoPlayerRef.current
    } else if (mobileVideoPlayerRef.current?.videoRef.current) {
      playerRef = mobileVideoPlayerRef.current
    }

    if (!playerRef || !playerRef.videoRef.current) {
      console.error('Video player ref not found')
      return
    }

    const video = playerRef.videoRef.current

    // 如果点击的是当前正在播放的字幕，切换播放/暂停状态
    if (playingSubtitleId === subtitleId && Math.abs(video.currentTime - time) < 1) {
      if (!video.paused) {
        playerRef.pause()
        return
      }
    }

    // 暂停所有其他视频
    document.querySelectorAll('video').forEach(v => {
      if (v !== video) {
        v.pause()
      }
    })

    // 设置视频当前时间（会自动跳转到对应帧）
    playerRef.seekTo(time)
    setPlayingSubtitleId(subtitleId)

    // 确保跳转后再播放，避免某些浏览器的时序问题
    if (shouldPlay) {
      // 使用 setTimeout 确保视频已经跳转
      setTimeout(() => {
        playerRef.play()
        // 如果提供了结束时间，播放完该字幕后暂停
        if (endTime !== undefined) {
          setPauseAfterSubtitle(endTime)
        }
      }, 50)
    }
  }

  const handleRepeatSubtitle = () => {
    if (!currentSubtitle) return

    let playerRef: VideoPlayerRef | null | undefined = null
    if (videoPlayerRef.current?.videoRef.current) {
      playerRef = videoPlayerRef.current
    } else if (mobileVideoPlayerRef.current?.videoRef.current) {
      playerRef = mobileVideoPlayerRef.current
    }

    if (!playerRef || !playerRef.videoRef.current) {
      console.error('Video player ref not found')
      return
    }

    const startTime = currentSubtitle.startTime / 1000
    const endTime = currentSubtitle.endTime / 1000

    playerRef.seekTo(startTime)
    playerRef.play()

    const checkTime = () => {
      if (playerRef.videoRef.current && playerRef.videoRef.current.currentTime >= endTime) {
        playerRef.seekTo(startTime)
        playerRef.play()
      }
    }

    const interval = setInterval(checkTime, 100)

    setTimeout(() => {
      clearInterval(interval)
    }, 10000) // 10秒后停止循环
  }

  const handlePlayPause = () => {
    let playerRef: VideoPlayerRef | null | undefined = null
    if (videoPlayerRef.current?.videoRef.current) {
      playerRef = videoPlayerRef.current
    } else if (mobileVideoPlayerRef.current?.videoRef.current) {
      playerRef = mobileVideoPlayerRef.current
    }

    if (!playerRef || !playerRef.videoRef.current) return

    if (playerRef.videoRef.current.paused) {
      playerRef.play()
    } else {
      playerRef.pause()
    }
  }

  const handlePreviousSubtitle = () => {
    if (!currentSubtitle) return

    const currentIndex = subtitles.findIndex(s => s.id === currentSubtitle.id)
    if (currentIndex > 0) {
      const prevSubtitle = subtitles[currentIndex - 1]
      let playerRef: VideoPlayerRef | null | undefined = null
      if (videoPlayerRef.current?.videoRef.current) {
        playerRef = videoPlayerRef.current
      } else if (mobileVideoPlayerRef.current?.videoRef.current) {
        playerRef = mobileVideoPlayerRef.current
      }

      if (playerRef && playerRef.videoRef.current) {
        playerRef.seekTo(prevSubtitle.startTime / 1000)
        playerRef.play()
      }
    }
  }

  const handleNextSubtitle = () => {
    if (!currentSubtitle) return

    const currentIndex = subtitles.findIndex(s => s.id === currentSubtitle.id)
    if (currentIndex < subtitles.length - 1) {
      const nextSubtitle = subtitles[currentIndex + 1]
      let playerRef: VideoPlayerRef | null | undefined = null
      if (videoPlayerRef.current?.videoRef.current) {
        playerRef = videoPlayerRef.current
      } else if (mobileVideoPlayerRef.current?.videoRef.current) {
        playerRef = mobileVideoPlayerRef.current
      }

      if (playerRef && playerRef.videoRef.current) {
        playerRef.seekTo(nextSubtitle.startTime / 1000)
        playerRef.play()
      }
    }
  }

  const handleToggleLoop = () => {
    const newLoopMode = loopMode === 'none' ? 'all' : 'none'
    setLoopMode(newLoopMode)

    let playerRef: VideoPlayerRef | null | undefined = null
    if (videoPlayerRef.current?.videoRef.current) {
      playerRef = videoPlayerRef.current
    } else if (mobileVideoPlayerRef.current?.videoRef.current) {
      playerRef = mobileVideoPlayerRef.current
    }

    if (playerRef && playerRef.videoRef.current) {
      playerRef.videoRef.current.loop = newLoopMode === 'all'
    }
  }

  const checkFavorite = async () => {
    try {
      const response = await fetch(`/api/favorite/check?videoId=${videoId}`)
      const data = await response.json()
      if (data.success) {
        setIsFavorited(data.data.isFavorited)
      }
    } catch (error) {
      console.error('检查收藏状态失败:', error)
    }
  }

  const toggleVideoFavorite = async () => {
    if (!user) {
      alert('请先登录')
      return
    }

    try {
      if (isFavorited) {
        // 取消收藏
        const response = await fetch(`/api/favorite?videoId=${videoId}`, {
          method: 'DELETE'
        })
        const data = await response.json()
        if (data.success) {
          setIsFavorited(false)
          alert('已取消收藏')
        }
      } else {
        // 添加收藏
        const response = await fetch('/api/favorite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId })
        })
        const data = await response.json()
        if (data.success) {
          setIsFavorited(true)
          alert('已添加到收藏')
        }
      }
    } catch (error) {
      console.error('收藏操作失败:', error)
      alert('操作失败，请稍后重试')
    }
  }

  const handleSubtitleUpdate = async (subtitleId: number, enText: string, zhText: string) => {
    try {
      const response = await fetch('/api/admin/subtitles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          subtitleId,
          enText,
          zhText
        })
      })
      const data = await response.json()
      if (data.success) {
        // 更新本地字幕状态
        setSubtitles(prevSubtitles =>
          prevSubtitles.map(sub =>
            sub.id === subtitleId
              ? { ...sub, text: { en: enText, zh: zhText } }
              : sub
          )
        )
        alert('字幕更新成功')
      } else {
        alert(data.error || '更新失败')
      }
    } catch (error) {
      console.error('更新字幕失败:', error)
      alert('更新失败，请稍后重试')
    }
  }

  const handleWordSave = async (wordData: {
    word: string
    definition: string
    translation: string
    partOfSpeech: string
    sentence?: string
    sentenceTranslation?: string
    usPhonetic?: string
    ukPhonetic?: string
    collocations?: string[]
    synonyms?: string[]
    antonyms?: string[]
  }) => {
    if (!user) {
      alert('请先登录')
      return
    }

    try {
      const response = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          word: wordData.word,
          definition: wordData.definition,
          translation: wordData.translation,
          partOfSpeech: wordData.partOfSpeech,
          sentence: wordData.sentence,
          sentenceTranslation: wordData.sentenceTranslation,
          usPhonetic: wordData.usPhonetic,
          ukPhonetic: wordData.ukPhonetic,
          collocations: wordData.collocations,
          synonyms: wordData.synonyms,
          antonyms: wordData.antonyms,
          timestamp: currentTime
        })
      })

      if (response.ok) {
        setSavedWords(prev => new Set([...Array.from(prev), wordData.word.toLowerCase()]))
        alert('单词已保存到单词本')
      } else {
        const errorData = await response.json()
        alert(errorData.error || '保存失败')
      }
    } catch (error) {
      console.error('保存单词失败:', error)
    }
  }

  const handleExpressionSave = async (text: string, translation: string) => {
    if (!user) {
      alert('请先登录')
      return
    }

    try {
      const response = await fetch('/api/expressions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          videoId,
          text,
          translation,
          timestamp: currentTime
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSavedExpressions(prev => new Map([...prev, [text, { id: data.data.expression.id, text }]]))
        alert('表达已保存到表达卡片')
        setShowExpressionCard(false)
      }
    } catch (error) {
      console.error('保存表达失败:', error)
    }
  }

  const handleToggleFavorite = async (subtitle: SubtitleEntry) => {
    if (!user) {
      alert('请先登录')
      return
    }

    if (!subtitle) {
      return
    }

    const text = subtitle.text.en
    const savedExpression = savedExpressions.get(text)

    if (savedExpression) {
      // 取消收藏
      try {
        const response = await fetch(`/api/expressions?id=${savedExpression.id}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          const newMap = new Map(savedExpressions)
          newMap.delete(text)
          setSavedExpressions(newMap)
          alert('已取消收藏')
        } else {
          const errorData = await response.json()
          alert('取消收藏失败: ' + (errorData.error || '未知错误'))
        }
      } catch (error) {
        console.error('取消收藏失败:', error)
        alert('取消收藏失败: ' + (error instanceof Error ? error.message : '未知错误'))
      }
    } else {
      // 直接收藏（使用中文字幕作为翻译）
      const translation = subtitle.text.zh || ''
      try {
        const response = await fetch('/api/expressions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            videoId,
            text,
            translation,
            timestamp: subtitle.startTime / 1000
          })
        })

        if (response.ok) {
          const data = await response.json()
          setSavedExpressions(prev => new Map([...prev, [text, { id: data.data.expression.id, text }]]))
          alert('已收藏')
        } else {
          const errorData = await response.json()
          alert('收藏失败: ' + (errorData.error || '未知错误'))
        }
      } catch (error) {
        console.error('收藏失败:', error)
        alert('收藏失败: ' + (error instanceof Error ? error.message : '未知错误'))
      }
    }
  }

  const handleSaveNote = async () => {
    if (!user) {
      alert('请先登录')
      return
    }

    if (!noteText.trim()) {
      alert('请输入笔记内容')
      return
    }

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          videoId,
          text: noteText,
          timestamp: currentTime,
          subtitleText: currentSubtitle?.text.en || ''
        })
      })

      if (response.ok) {
        const data = await response.json()
        setNotes([...notes, data.data.note])
        setNoteText('')
        alert('笔记已保存')
      }
    } catch (error) {
      console.error('保存笔记失败:', error)
      alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  const handlePrintSubtitles = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const content = subtitles.map(sub => {
      const time = `${(sub.startTime / 1000).toFixed(2)}s`
      return `
        <div style="margin-bottom: 20px; padding: 10px; border-bottom: 1px solid #eee;">
          <div style="color: #666; font-size: 12px; margin-bottom: 5px;">[${time}]</div>
          <div style="font-size: 16px; margin-bottom: 5px;">${sub.text.en}</div>
          <div style="font-size: 14px; color: #666;">${sub.text.zh || ''}</div>
        </div>
      `
    }).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${video?.title} - 字幕</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>${video?.title}</h1>
          ${content}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  // 查词功能
  const handleWordClick = async (word: string) => {
    setSelectedWord(word)
    setLoadingDict(true)
    setShowWordCard(true)

    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
      if (response.ok) {
        const data = await response.json()
        if (data && data[0]) {
          const entry: DictionaryEntry = {
            word: data[0].word,
            phonetic: data[0].phonetic || data[0].phonetics?.[0]?.text,
            audio: data[0].phonetics?.find((p: any) => p.audio)?.audio,
            meanings: data[0].meanings.map((m: any) => ({
              partOfSpeech: m.partOfSpeech,
              definitions: m.definitions.slice(0, 3).map((d: any) => ({
                definition: d.definition,
                example: d.example
              }))
            }))
          }
          setDictionaryEntry(entry)
        }
      }
    } catch (error) {
      console.error('查词失败:', error)
    } finally {
      setLoadingDict(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-gray-400">视频不存在</div>
      </div>
    )
  }

  const isCurrentExpressionSaved = currentSubtitle ? savedExpressions.has(currentSubtitle.text.en) : false

  return (
    <div className="min-h-screen bg-primary">
      {/* 顶部导航 */}
      <header className="bg-surface-light border-b border-gray-800 sticky top-0 relative" style={{ zIndex: 100, pointerEvents: 'auto' }}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('点击返回首页')
                try {
                  router.push('/')
                } catch (error) {
                  console.error('导航失败:', error)
                  window.location.href = '/'
                }
              }}
              className="flex items-center gap-2 text-gray-300 hover:text-accent transition-colors cursor-pointer"
              type="button"
            >
              <ArrowLeft size={20} />
              返回首页
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-heading font-semibold text-white truncate">
                {video.title}
              </h1>
            </div>

            {/* 右侧导航 */}
            <div className="flex items-center gap-1">
              {/* 功能按钮 */}
              <button
                onClick={handlePrintSubtitles}
                className="p-1.5 rounded-lg transition-colors hidden text-gray-300 hover:text-accent hover:bg-accent/10"
                title="打印"
              >
                <Printer size={16} />
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('点击单词本')
                  try {
                    router.push('/vocabulary')
                  } catch (error) {
                    console.error('导航失败:', error)
                    window.location.href = '/vocabulary'
                  }
                }}
                className="p-1.5 text-gray-300 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors cursor-pointer"
                title="单词本"
                type="button"
              >
                <Book size={16} />
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('点击笔记本')
                  try {
                    router.push('/notes')
                  } catch (error) {
                    console.error('导航失败:', error)
                    window.location.href = '/notes'
                  }
                }}
                className="p-1.5 text-gray-300 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors cursor-pointer"
                title="笔记"
                type="button"
              >
                <FileText size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="px-2 sm:px-4 lg:px-8 py-2 max-w-[1800px] mx-auto h-[calc(100vh-64px)] overflow-hidden">
        {/* 移动端布局：视频固定在顶部，字幕在中间，控制栏在底部 */}
        <div className="2xl:hidden h-full flex flex-col">
          {/* 移动端：视频区域 - 使用自适应高度 */}
          <div className="flex-shrink-0 relative -mb-4 w-full aspect-video max-h-[35vh]">
            {/* 视频右上角收藏按钮 */}
            <button
              onClick={toggleVideoFavorite}
              className="absolute top-3 right-3 z-50 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
              title={isFavorited ? '取消收藏' : '收藏'}
            >
              <Star size={20} fill={isFavorited ? 'currentColor' : 'none'} className={isFavorited ? 'text-yellow-400' : 'text-white'} />
            </button>

            <VideoPlayer
              ref={mobileVideoPlayerRef}
              src={video.filePath}
              subtitles={video.subtitles || []}
              parsedSubtitles={subtitles}
              onTimeUpdate={handleTimeUpdate}
              onSubtitleChange={handleSubtitleChange}
              playbackRate={playbackRate}
              onPlaybackRateChange={setPlaybackRate}
              loopMode={loopMode}
              onLoopModeChange={setLoopMode}
              hideControls={true}
              showBasicControls={true}
            />
          </div>

          {/* 移动端：视频下方功能控制栏 */}
          <div className="flex-shrink-0 bg-surface border-b border-gray-700 px-3 py-2 z-50">
              <div className="flex items-center justify-around gap-2">
                {/* 字幕 - 下拉式 */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowSubtitleDropdown(!showSubtitleDropdown)}
                    className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors flex items-center gap-1 ${
                      showSubtitleDropdown
                        ? 'bg-accent text-white'
                        : 'text-gray-400 hover:text-white hover:bg-surface-light'
                    }`}
                  >
                    字幕
                    <ChevronDown size={14} />
                  </button>

                  {/* 下拉菜单 */}
                  {showSubtitleDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-surface border border-gray-700 rounded-lg shadow-xl z-50 min-w-[100px]">
                      <button
                        onClick={() => {
                          setSubtitleMode('bilingual')
                          setShowSubtitleDropdown(false)
                        }}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                          subtitleMode === 'bilingual'
                            ? 'bg-accent text-white'
                            : 'text-gray-400 hover:text-white hover:bg-surface-light'
                        }`}
                      >
                        双语
                      </button>
                      <button
                        onClick={() => {
                          setSubtitleMode('zh')
                          setShowSubtitleDropdown(false)
                        }}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                          subtitleMode === 'zh'
                            ? 'bg-accent text-white'
                            : 'text-gray-400 hover:text-white hover:bg-surface-light'
                        }`}
                      >
                        中文
                      </button>
                      <button
                        onClick={() => {
                          setSubtitleMode('en')
                          setShowSubtitleDropdown(false)
                        }}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                          subtitleMode === 'en'
                            ? 'bg-accent text-white'
                            : 'text-gray-400 hover:text-white hover:bg-surface-light'
                        }`}
                      >
                        英文
                      </button>
                    </div>
                  )}
                </div>

                {/* 跟读 */}
                <button
                  onClick={() => {
                    if (mobileFunctionMode === 'follow') {
                      setMobileFunctionMode('none')
                    } else {
                      setMobileFunctionMode('follow')
                    }
                  }}
                  className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${
                    mobileFunctionMode === 'follow'
                      ? 'bg-accent text-white'
                      : 'text-gray-400 hover:text-white hover:bg-surface-light'
                  }`}
                >
                  跟读
                </button>

                {/* 听写 */}
                <button
                  onClick={() => {
                    if (mobileFunctionMode === 'dictation') {
                      setMobileFunctionMode('none')
                    } else {
                      setMobileFunctionMode('dictation')
                    }
                  }}
                  className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${
                    mobileFunctionMode === 'dictation'
                      ? 'bg-accent text-white'
                      : 'text-gray-400 hover:text-white hover:bg-surface-light'
                  }`}
                >
                  听写
                </button>

                {/* 词卡 - 链接到单词本 */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('点击词卡')
                    try {
                      router.push('/vocabulary')
                    } catch (error) {
                      console.error('导航失败:', error)
                      window.location.href = '/vocabulary'
                    }
                  }}
                  className="px-3 py-1.5 text-sm font-bold rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-surface-light cursor-pointer"
                  type="button"
                >
                  词卡
                </button>
              </div>
          </div>

          {/* 移动端：字幕面板 - 可滚动，占据剩余空间 */}
          <div className="flex-1 overflow-hidden relative z-30 min-h-0">
            <SubtitlePanel
              subtitles={subtitles}
              currentTime={currentTime}
              onSubtitleClick={handleSubtitleClick}
              subtitleMode={subtitleMode}
              currentSubtitle={currentSubtitle}
              onPlay={handleRepeatSubtitle}
              onTogglePhonetics={() => setShowPhonetics(!showPhonetics)}
              showPhonetics={showPhonetics}
              isVideoVisible={isVideoVisible}
              onToggleVideoVisibility={toggleVideoVisibility}
              onCopy={() => {
                if (currentSubtitle) {
                  navigator.clipboard.writeText(currentSubtitle.text.en)
                  alert('已复制到剪贴板')
                }
              }}
              onToggleFavorite={handleToggleFavorite}
              isFavorite={isCurrentExpressionSaved}
              savedExpressions={savedExpressions}
              onToggleNotes={() => setShowNotes(!showNotes)}
              showNotes={showNotes}
              noteText={noteText}
              onNoteChange={setNoteText}
              onSaveNote={handleSaveNote}
              notes={notes.filter(n => Math.abs(n.timestamp - currentTime) < 5)}
              onToggleRecorder={() => setShowRecorder(!showRecorder)}
              showRecorder={showRecorder}
              savedWords={savedWords}
              onWordSave={handleWordSave}
              fontSize={subtitleFontSize}
              isAdmin={isAdmin}
              videoId={videoId}
              onSubtitleUpdate={handleSubtitleUpdate}
              hideHeader={true}
              isMobile={true}
              mobileFunctionMode={mobileFunctionMode}
              onPrintSubtitles={handlePrintSubtitles}
            />
          </div>

          {/* 移动端：底部播放控制栏 */}
          <div className="flex-shrink-0 bg-surface-light border-t border-gray-700 px-4 py-2 z-50">
            <div className="flex items-center justify-between gap-2">
              {/* 倍速 - 下拉式 */}
              <div className="relative" ref={speedDropdownRef}>
                <button
                  onClick={() => setShowSpeedDropdown(!showSpeedDropdown)}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                >
                  倍速
                  <ChevronDown size={12} />
                </button>

                {showSpeedDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 bg-surface border border-gray-700 rounded-lg shadow-xl z-50 min-w-[80px]">
                    {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => {
                          setPlaybackRate(rate)
                          setShowSpeedDropdown(false)
                          const playerRef = mobileVideoPlayerRef.current || videoPlayerRef.current
                          if (playerRef && playerRef.videoRef.current) {
                            playerRef.videoRef.current.playbackRate = rate
                          }
                        }}
                        className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                          playbackRate === rate
                            ? 'bg-accent text-white'
                            : 'text-gray-400 hover:text-white hover:bg-surface-light'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 上一句 */}
              <button
                onClick={handlePreviousSubtitle}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="上一句"
              >
                <SkipBack size={20} />
              </button>

              {/* 播放/暂停 */}
              <button
                onClick={handlePlayPause}
                className="p-2 text-gray-400 hover:text-accent transition-colors"
                title="播放/暂停"
              >
                <Play size={20} />
              </button>

              {/* 下一句 */}
              <button
                onClick={handleNextSubtitle}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="下一句"
              >
                <SkipForward size={20} />
              </button>

              {/* 单片循环 */}
              <button
                onClick={handleToggleLoop}
                className={`text-xs transition-colors ${
                  loopMode === 'all'
                    ? 'text-accent'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="单片循环"
              >
                单片循环
              </button>
            </div>
          </div>
        </div>

        {/* 桌面端布局：保持原有两列布局 */}
        <div className="hidden 2xl:grid 2xl:grid-cols-2 gap-4 sm:gap-6 items-center h-full">
          {/* 左侧：视频播放器 + 外部控制面板 + 视频信息 - 固定高度 */}
          <div
            className={`space-y-3 sm:space-y-4 transition-all duration-300 ease-in-out overflow-hidden ${
              isVideoVisible ? 'max-h-[4000px] opacity-100' : 'max-h-0 opacity-0 m-0 p-0'
            }`}
            style={{ maxHeight: isVideoVisible ? 'calc(100vh - 120px)' : '0' }}
          >
            {/* VideoPlayer组件包含视频播放器和外部控制面板 */}
            <VideoPlayer
              ref={videoPlayerRef}
              src={video.filePath}
              subtitles={video.subtitles || []}
              parsedSubtitles={subtitles}
              onTimeUpdate={handleTimeUpdate}
              onSubtitleChange={handleSubtitleChange}
            />

            {/* 当前播放字幕显示 */}
            <div className="bg-surface-light rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">当前字幕</h3>
                <div className="flex items-center gap-2">
                  {video.category && (
                    <span className="px-2 py-0.5 bg-accent/20 text-accent rounded-full text-xs">
                      {video.difficulty}
                    </span>
                  )}
                  <button
                    onClick={toggleVideoFavorite}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isFavorited
                        ? 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20'
                        : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10'
                    }`}
                    title={isFavorited ? '取消收藏' : '收藏'}
                  >
                    <Star size={16} fill={isFavorited ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>

              {currentSubtitle ? (
                <div className="space-y-2">
                  {/* 英文字幕 */}
                  <div className="text-lg sm:text-xl text-white font-medium leading-relaxed">
                    {currentSubtitle.text.en}
                  </div>
                  {/* 中文字幕 */}
                  {currentSubtitle.text.zh && (
                    <div className="text-sm sm:text-base text-gray-400 leading-relaxed">
                      {currentSubtitle.text.zh}
                    </div>
                  )}
                  {/* 时间戳 */}
                  <div className="text-xs text-gray-500 font-mono">
                    {formatTime(currentSubtitle.startTime / 1000)} - {formatTime(currentSubtitle.endTime / 1000)}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-6">
                  <p>播放视频以显示字幕</p>
                </div>
              )}
            </div>
          </div>

          {/* 右侧：学习模式面板 - 高度与左侧一致 */}
          <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)' }}>
            {/* 词卡弹窗 */}
            {showWordCard && selectedWord && (
              <div className="mb-3 flex-shrink-0">
                <WordCard
                  word={selectedWord}
                  entry={dictionaryEntry}
                  loading={loadingDict}
                  onSave={(translation, exampleTranslations) => {
                    const firstMeaning = dictionaryEntry?.meanings?.[0]
                    const firstDef = firstMeaning?.definitions?.[0]
                    // 获取第一个例句的翻译
                    const firstExampleTranslation = exampleTranslations && Object.values(exampleTranslations)[0]

                    handleWordSave({
                      word: selectedWord,
                      definition: firstDef?.definition || '',
                      translation,
                      partOfSpeech: firstMeaning?.partOfSpeech || '',
                      sentence: firstDef?.example,
                      sentenceTranslation: firstExampleTranslation,
                      usPhonetic: dictionaryEntry?.usPhonetic,
                      ukPhonetic: dictionaryEntry?.ukPhonetic,
                      collocations: dictionaryEntry?.collocations,
                      synonyms: dictionaryEntry?.meanings?.flatMap(m => m.synonyms || []),
                      antonyms: dictionaryEntry?.meanings?.flatMap(m => m.antonyms || [])
                    })
                    setShowWordCard(false)
                  }}
                  isSaved={selectedWord ? savedWords.has(selectedWord.toLowerCase()) : false}
                  onClose={() => setShowWordCard(false)}
                />
              </div>
            )}

            {/* 字幕面板 - 固定高度容器，字幕可滚动 */}
            <div className="bg-surface-light rounded-xl flex-1 flex flex-col">
              <SubtitlePanel
                subtitles={subtitles}
                currentTime={currentTime}
                onSubtitleClick={handleSubtitleClick}
                subtitleMode={subtitleMode}
                onSubtitleModeChange={setSubtitleMode}
                currentSubtitle={currentSubtitle}
                onPlay={handleRepeatSubtitle}
                onTogglePhonetics={() => setShowPhonetics(!showPhonetics)}
                showPhonetics={showPhonetics}
                isVideoVisible={isVideoVisible}
                onToggleVideoVisibility={toggleVideoVisibility}
                onCopy={() => {
                  if (currentSubtitle) {
                    navigator.clipboard.writeText(currentSubtitle.text.en)
                    alert('已复制到剪贴板')
                  }
                }}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={isCurrentExpressionSaved}
                savedExpressions={savedExpressions}
                onToggleNotes={() => setShowNotes(!showNotes)}
                showNotes={showNotes}
                noteText={noteText}
                onNoteChange={setNoteText}
                onSaveNote={handleSaveNote}
                notes={notes.filter(n => Math.abs(n.timestamp - currentTime) < 5)}
                onToggleRecorder={() => setShowRecorder(!showRecorder)}
                showRecorder={showRecorder}
                savedWords={savedWords}
                onWordSave={handleWordSave}
                fontSize={subtitleFontSize}
                isAdmin={isAdmin}
                videoId={videoId}
                onSubtitleUpdate={handleSubtitleUpdate}
                onPrintSubtitles={handlePrintSubtitles}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// 格式化时间显示
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
