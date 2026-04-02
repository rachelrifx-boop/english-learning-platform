'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Film, Upload, Trash2, Clock, Subtitles, Key, Edit3, X, Save, AlertCircle, Sparkles, RefreshCw, GripVertical, ImagePlus } from 'lucide-react'
import { uploadFile } from '@/lib/storage'

interface Video {
  id: string
  title: string
  description: string | null
  filePath: string
  coverPath: string | null
  duration: number
  difficulty: string
  category: string | null
  createdAt: string
  subtitles: Array<{ id: string; language: string }>
  _count: { words: number; expressions: number }
  displayOrder?: number
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

export default function AdminPage() {
  const router = useRouter()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [showApiDialog, setShowApiDialog] = useState(false)
  const [generatingSubtitle, setGeneratingSubtitle] = useState(false)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [speechService, setSpeechService] = useState<'openai' | 'google' | 'local'>('local')
  const [modelSize, setModelSize] = useState<'tiny' | 'base' | 'small' | 'medium' | 'large-v3'>('small')
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [updating, setUpdating] = useState(false)
  const [analyzingDifficulty, setAnalyzingDifficulty] = useState(false)
  const [batchUpdating, setBatchUpdating] = useState(false)
  const [batchUpdateStatus, setBatchUpdateStatus] = useState('')
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  const [updatingDuration, setUpdatingDuration] = useState(false)
  const [generatingCover, setGeneratingCover] = useState(false)
  const [generatingCoverVideoId, setGeneratingCoverVideoId] = useState<string | null>(null)

  // 上传表单状态
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: ''
  })
  const [files, setFiles] = useState({
    video: null as File | null,
    cover: null as File | null,
    englishSubtitle: null as File | null,
    chineseSubtitle: null as File | null
  })

  // 编辑表单状态
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    difficulty: 'B1',
    category: ''
  })

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/admin/videos')
      const data = await response.json()
      if (data.success) {
        setVideos(data.data.videos)
      }
    } catch (error) {
      console.error('获取视频列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!files.video) {
      alert('请选择视频文件')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadStatus('正在上传视频到云端...')

    try {
      // 1. 上传视频文件到云端存储（R2或Supabase）
      // 对于大文件，使用预签名 URL 直接上传，绕过 Vercel 的大小限制
      setUploadStatus('正在上传视频到云端...')
      const videoResult = await uploadFile(
        files.video,
        'videos',
        (progress) => {
          // 上传进度 0-60%
          setUploadProgress(Math.round(progress * 0.6))
        }
      )

      if (videoResult.error || !videoResult.url) {
        alert(`视频上传失败: ${videoResult.error}`)
        setUploading(false)
        return
      }

      setUploadProgress(65)
      setUploadStatus('视频上传成功，正在生成封面...')

      // 2. 自动截取视频首帧作为封面（如果没有手动上传封面）
      let coverUrl: string | null = null
      if (files.cover) {
        // 使用用户上传的封面
        setUploadStatus('正在上传封面...')
        const coverResult = await uploadFile(files.cover, 'covers')
        if (!coverResult.error && coverResult.url) {
          coverUrl = coverResult.url
        }
      } else {
        // 自动截取视频首帧
        setUploadStatus('正在自动截取视频首帧...')
        try {
          const coverResponse = await fetch('/api/admin/extract-cover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: videoResult.url })
          })
          const coverData = await coverResponse.json()
          if (coverData.success && coverData.data.coverUrl) {
            coverUrl = coverData.data.coverUrl
            console.log('[UPLOAD] 自动封面生成成功:', coverUrl)
          } else {
            console.warn('[UPLOAD] 自动封面生成失败，将使用默认封面')
          }
        } catch (error) {
          console.warn('[UPLOAD] 自动封面生成失败:', error)
        }
      }

      setUploadProgress(75)
      setUploadStatus('正在上传字幕...')

      // 3. 上传字幕文件
      let englishSubtitleUrl: string | null = null
      let chineseSubtitleUrl: string | null = null

      if (files.englishSubtitle) {
        const enResult = await uploadFile(files.englishSubtitle, 'subtitles')
        if (!enResult.error && enResult.url) {
          englishSubtitleUrl = enResult.url
        }
      }

      if (files.chineseSubtitle) {
        const zhResult = await uploadFile(files.chineseSubtitle, 'subtitles')
        if (!zhResult.error && zhResult.url) {
          chineseSubtitleUrl = zhResult.url
        }
      }

      setUploadProgress(75)
      setUploadStatus('正在创建视频记录...')

      // 4. 创建视频记录（上传时已经获取了时长，直接使用）
      const response = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          videoUrl: videoResult.url,
          coverUrl: coverUrl,
          englishSubtitleUrl: englishSubtitleUrl,
          chineseSubtitleUrl: chineseSubtitleUrl,
          duration: videoResult.duration, // 使用上传时获取的时长
          difficulty: 'B1' // 默认难度，有字幕会自动分析
        })
      })

      const data = await response.json()

      if (!data.success) {
        alert(data.error || '创建视频记录失败')
        setUploading(false)
        return
      }

      setUploadProgress(100)
      setUploadStatus('上传成功！')

      // 上传成功
      alert('视频上传成功！')

      // 重置表单
      setFormData({ title: '', description: '', category: '' })
      setFiles({ video: null, cover: null, englishSubtitle: null, chineseSubtitle: null })
      setShowUploadForm(false)
      setUploadProgress(0)
      setUploadStatus('')
      fetchVideos()
    } catch (error: any) {
      console.error('上传失败:', error)
      alert('上传失败：' + (error.message || '请稍后重试'))
    } finally {
      setUploading(false)
      setUploadProgress(0)
      setUploadStatus('')
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleGenerateSubtitles = async (videoId: string) => {
    setSelectedVideoId(videoId)
    setShowApiDialog(true)
  }

  const confirmGenerateSubtitles = async () => {
    if (!selectedVideoId) {
      alert('请选择要生成字幕的视频')
      return
    }

    if (speechService === 'local' && !apiKey.trim()) {
      alert('请输入百度翻译 API Key（APP_ID,SECRET_KEY）')
      return
    }

    setGeneratingSubtitle(true)
    setShowApiDialog(false)
    setUploadProgress(0)
    setUploadStatus('正在启动字幕生成任务...')

    try {
      // 使用新的后台 API
      const response = await fetch('/api/admin/subtitles/generate-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: selectedVideoId,
          modelSize: modelSize,
          baiduKey: apiKey.trim()
        })
      })

      const data = await response.json()

      if (!data.success) {
        alert(data.error || '启动字幕生成失败')
        setGeneratingSubtitle(false)
        return
      }

      // 开始轮询状态
      setUploadStatus('AI 正在识别语音...')
      pollSubtitleStatus(selectedVideoId)

    } catch (error: any) {
      console.error('启动字幕生成失败:', error)
      alert('启动字幕生成失败：' + (error.message || '请稍后重试'))
      setGeneratingSubtitle(false)
    }
  }

  // 轮询字幕生成状态
  const pollSubtitleStatus = async (videoId: string) => {
    let isPolling = true
    let notStartedCount = 0 // 连续 not_started 计数
    const MAX_NOT_STARTED = 5 // 最多 5 次后停止

    const pollInterval = setInterval(async () => {
      if (!isPolling) {
        clearInterval(pollInterval)
        return
      }

      try {
        const response = await fetch(`/api/admin/subtitles/status?videoId=${videoId}`)
        const data = await response.json()

        if (data.success && data.data) {
          const { status, progress, message } = data.data

          setUploadProgress(progress)
          setUploadStatus(message)

          if (status === 'completed') {
            isPolling = false
            clearInterval(pollInterval)
            setGeneratingSubtitle(false)
            setUploadProgress(0)
            setUploadStatus('')
            alert('字幕生成成功！')
            fetchVideos()
          } else if (status === 'error') {
            isPolling = false
            clearInterval(pollInterval)
            setGeneratingSubtitle(false)
            setUploadProgress(0)
            setUploadStatus('')
            alert('字幕生成失败：' + message)
          } else if (status === 'not_started') {
            notStartedCount++
            // 状态文件不存在，重新获取视频列表检查
            const videosResponse = await fetch('/api/admin/videos')
            const videosData = await videosResponse.json()
            if (videosData.success) {
              const video = videosData.data.videos.find((v: Video) => v.id === videoId)
              if (video && video.subtitles.length > 0) {
                // 字幕已生成
                isPolling = false
                clearInterval(pollInterval)
                setGeneratingSubtitle(false)
                setUploadProgress(0)
                setUploadStatus('')
                alert('字幕生成成功！')
                fetchVideos()
              } else if (notStartedCount >= MAX_NOT_STARTED) {
                // 连续多次 not_started 且字幕未生成，停止轮询
                isPolling = false
                clearInterval(pollInterval)
                setGeneratingSubtitle(false)
                setUploadProgress(0)
                setUploadStatus('')
                alert('字幕生成失败：任务未启动或已失败')
              }
            }
          } else {
            // 有进度，重置计数
            notStartedCount = 0
          }
        }
      } catch (error) {
        console.error('获取字幕状态失败:', error)
      }
    }, 2000) // 每 2 秒轮询一次

    // 30 分钟后自动停止轮询
    setTimeout(() => {
      if (isPolling) {
        isPolling = false
        clearInterval(pollInterval)
        setGeneratingSubtitle(false)
        setUploadProgress(0)
        setUploadStatus('')
        alert('字幕生成超时，请检查后台进程')
      }
    }, 30 * 60 * 1000)
  }

  const handleEditVideo = (video: Video) => {
    setEditingVideo(video)
    setEditFormData({
      title: video.title,
      description: video.description || '',
      difficulty: video.difficulty,
      category: video.category || ''
    })
  }

  const handleUpdateVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingVideo) return

    setUpdating(true)

    try {
      const response = await fetch(`/api/admin/videos/${editingVideo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      })

      const data = await response.json()

      if (!data.success) {
        alert(data.error || '更新失败')
        setUpdating(false)
        return
      }

      alert('更新成功！')
      setEditingVideo(null)
      fetchVideos()
    } catch (error: any) {
      console.error('更新失败:', error)
      alert('更新失败：' + (error.message || '请稍后重试'))
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('确定要删除这个视频吗？此操作不可撤销。')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/videos/${videoId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!data.success) {
        alert(data.error || '删除失败')
        return
      }

      alert('删除成功！')
      fetchVideos()
    } catch (error: any) {
      console.error('删除失败:', error)
      alert('删除失败：' + (error.message || '请稍后重试'))
    }
  }

  const handleDeleteSubtitles = async (videoId: string) => {
    if (!confirm('确定要删除这个视频的所有字幕吗？此操作不可撤销。\n\n删除后可以重新生成字幕。')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/subtitles?videoId=${videoId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!data.success) {
        alert(data.error || '删除字幕失败')
        return
      }

      alert('字幕删除成功！')
      setEditingVideo(null)
      fetchVideos()
    } catch (error: any) {
      console.error('删除字幕失败:', error)
      alert('删除字幕失败：' + (error.message || '请稍后重试'))
    }
  }

  const handleAnalyzeDifficulty = async () => {
    if (!editingVideo) return

    setAnalyzingDifficulty(true)

    try {
      const response = await fetch('/api/admin/analyze-difficulty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: editingVideo.id })
      })

      const data = await response.json()

      if (!data.success) {
        alert(data.error || '分析失败')
        return
      }

      const { level, confidence, details, previousLevel } = data.data

      // 更新编辑表单中的难度
      setEditFormData(prev => ({ ...prev, difficulty: level }))

      // 显示分析结果
      const resultMessage = `难度分析完成！\n\n` +
        `原难度: ${previousLevel}\n` +
        `新难度: ${level}\n` +
        `置信度: ${(confidence * 100).toFixed(0)}%\n\n` +
        `详细评分：\n` +
        `词汇难度: ${(details.vocabularyScore * 100).toFixed(0)}分\n` +
        `句子复杂度: ${(details.sentenceScore * 100).toFixed(0)}分\n` +
        `语速难度: ${(details.speedScore * 100).toFixed(0)}分\n` +
        `时长难度: ${(details.durationScore * 100).toFixed(0)}分`

      alert(resultMessage)
    } catch (error: any) {
      console.error('分析难度失败:', error)
      alert('分析难度失败：' + (error.message || '请稍后重试'))
    } finally {
      setAnalyzingDifficulty(false)
    }
  }

  // 更新单个视频时长
  const handleUpdateDuration = async () => {
    if (!editingVideo) return

    if (!confirm('确定要更新这个视频的时长吗？\n\n系统会从 R2 下载视频并使用 ffprobe 获取实际时长，可能需要几十秒到几分钟，取决于视频大小。')) {
      return
    }

    setUpdatingDuration(true)

    try {
      const response = await fetch('/api/admin/update-duration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: editingVideo.id })
      })

      const data = await response.json()

      if (!data.success) {
        alert(data.error || '更新时长失败')
        return
      }

      const { oldDuration, newDuration, formatted } = data.data

      alert(`时长更新成功！\n\n原时长: ${oldDuration}秒\n新时长: ${newDuration}秒 (${formatted})`)

      // 更新编辑中的视频时长
      setEditingVideo(prev => prev ? { ...prev, duration: newDuration } : null)

      fetchVideos()
    } catch (error: any) {
      console.error('更新时长失败:', error)
      alert('更新时长失败：' + (error.message || '请稍后重试'))
    } finally {
      setUpdatingDuration(false)
    }
  }

  // 为视频生成封面（从第10秒截取，避免黑屏）
  const handleGenerateCover = async (video: Video) => {
    if (!confirm(`确定要为视频 "${video.title}" 重新生成封面吗？\n\n系统会从视频第10秒截取帧作为封面（避免黑屏/淡入问题）。`)) {
      return
    }

    setGeneratingCover(true)
    setGeneratingCoverVideoId(video.id)

    try {
      console.log('[GENERATE COVER] 开始生成封面，视频:', video.title, '路径:', video.filePath)

      const response = await fetch('/api/admin/extract-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: video.filePath })
      })

      console.log('[GENERATE COVER] extract-cover 响应状态:', response.status)

      // 检查响应是否为 JSON
      const contentType = response.headers.get('content-type')
      console.log('[GENERATE COVER] 响应类型:', contentType)

      if (!response.ok) {
        const text = await response.text()
        console.error('[GENERATE COVER] API 错误响应:', text)
        alert('生成封面失败：HTTP ' + response.status)
        return
      }

      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('[GENERATE COVER] 非 JSON 响应:', text.substring(0, 200))
        alert('生成封面失败：服务器返回非 JSON 响应')
        return
      }

      const data = await response.json()
      console.log('[GENERATE COVER] 封面提取结果:', data)

      if (!data.success) {
        alert(data.error || '生成封面失败')
        return
      }

      // 更新视频的封面
      console.log('[GENERATE COVER] 开始更新视频封面:', data.data.coverUrl)
      const updateResponse = await fetch(`/api/admin/videos/${video.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverPath: data.data.coverUrl })
      })

      console.log('[GENERATE COVER] 更新视频响应状态:', updateResponse.status)

      if (!updateResponse.ok) {
        const text = await updateResponse.text()
        console.error('[GENERATE COVER] 更新视频 API 错误:', text)
        alert('封面生成成功，但更新视频失败：HTTP ' + updateResponse.status)
        return
      }

      const updateContentType = updateResponse.headers.get('content-type')
      if (!updateContentType || !updateContentType.includes('application/json')) {
        const text = await updateResponse.text()
        console.error('[GENERATE COVER] 更新视频非 JSON 响应:', text.substring(0, 200))
        alert('封面生成成功，但更新视频失败：服务器返回非 JSON 响应')
        return
      }

      const updateData = await updateResponse.json()

      if (!updateData.success) {
        alert('封面生成成功，但更新视频失败：' + (updateData.error || '未知错误'))
        return
      }

      alert('封面生成成功！')

      fetchVideos()
    } catch (error: any) {
      console.error('生成封面失败:', error)
      alert('生成封面失败：' + (error.message || '请稍后重试'))
    } finally {
      setGeneratingCover(false)
      setGeneratingCoverVideoId(null)
    }
  }

  // 批量更新所有视频时长
  const handleBatchUpdateDurations = async () => {
    if (!confirm('确定要批量更新所有视频的时长吗？\n\n这将使用 ffprobe 获取每个视频的实际时长，可能需要几分钟时间。请耐心等待，不要关闭页面。')) {
      return
    }

    setBatchUpdating(true)
    setBatchUpdateStatus('正在批量更新视频时长...')

    // 使用 AbortController 设置更长的超时时间（10 分钟）
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000)

    try {
      const response = await fetch('/api/admin/batch-update-durations', {
        method: 'POST',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // 检查 HTTP 状态
      if (!response.ok) {
        if (response.status === 401) {
          alert('未登录，请先登录')
        } else if (response.status === 403) {
          alert('无权访问，需要管理员权限')
        } else {
          alert(`服务器错误: ${response.status}`)
        }
        setBatchUpdateStatus('')
        setBatchUpdating(false)
        return
      }

      const data = await response.json()

      if (!data.success) {
        alert(data.error || '批量更新失败')
        setBatchUpdateStatus('')
        setBatchUpdating(false)
        return
      }

      const { results, summary } = data.data
      const updated = results.filter((r: any) => r.status === 'updated')

      alert(`批量更新完成！\n\n` +
        `总计: ${summary.total} 个视频\n` +
        `已更新: ${summary.successCount} 个\n` +
        `无需更新: ${summary.total - summary.successCount - summary.failCount} 个\n` +
        `失败: ${summary.failCount} 个` +
        (updated.length > 0 ? `\n\n更新详情：\n${updated.map((r: any) => `${r.title}: ${r.oldDuration}s -> ${r.newDuration}s`).join('\n')}` : '')
      )

      setBatchUpdateStatus('')
      fetchVideos()
    } catch (error: any) {
      console.error('批量更新失败:', error)

      if (error.name === 'AbortError') {
        alert('请求超时，批量更新时间过长。请稍后重试，或者使用单个视频更新功能。')
      } else {
        alert('批量更新失败：' + (error.message || '请稍后重试'))
      }

      setBatchUpdateStatus('')
    } finally {
      setBatchUpdating(false)
    }
  }

  // 拖拽处理函数
  const handleDragStart = (e: React.DragEvent, videoId: string) => {
    setDraggedItem(videoId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetVideoId: string) => {
    e.preventDefault()

    if (!draggedItem || draggedItem === targetVideoId) {
      setDraggedItem(null)
      return
    }

    // 创建新的视频顺序
    const draggedIndex = videos.findIndex(v => v.id === draggedItem)
    const targetIndex = videos.findIndex(v => v.id === targetVideoId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null)
      return
    }

    const newVideos = [...videos]
    const [removed] = newVideos.splice(draggedIndex, 1)
    newVideos.splice(targetIndex, 0, removed)

    // 更新本地状态
    setVideos(newVideos)
    setDraggedItem(null)

    // 保存到服务器
    setIsReordering(true)
    try {
      const response = await fetch('/api/admin/videos/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds: newVideos.map(v => v.id) })
      })

      const data = await response.json()
      if (!data.success) {
        alert(data.error || '更新排序失败')
        // 失败时恢复原顺序
        fetchVideos()
      }
    } catch (error) {
      console.error('更新排序失败:', error)
      alert('更新排序失败')
      fetchVideos()
    } finally {
      setIsReordering(false)
    }
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-2">
            视频管理
          </h1>
          <p className="text-gray-400">上传和管理课程视频</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBatchUpdateDurations}
            disabled={batchUpdating}
            className="flex items-center gap-2 px-4 py-2 bg-surface text-gray-300 rounded-lg hover:bg-surface-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="批量更新所有视频的实际时长"
          >
            <RefreshCw size={18} className={batchUpdating ? 'animate-spin' : ''} />
            {batchUpdating ? '更新中...' : '更新时长'}
          </button>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Upload size={20} />
            上传视频
          </button>
        </div>
      </div>

      {/* 上传表单 */}
      {showUploadForm && (
        <div className="bg-surface-light rounded-xl p-6 mb-8 animate-slide-up">
          <h2 className="text-xl font-heading font-semibold text-white mb-4">上传新视频</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="mb-4 p-3 bg-accent/10 border border-accent/30 rounded-lg">
              <p className="text-sm text-accent flex items-center gap-2">
                <Sparkles size={16} />
                <span>系统会根据英文字幕自动识别难度等级（A1-C2）</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  视频标题 *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  分类
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                >
                  <option value="">选择分类（可选）</option>
                  <option value="Vlog">Vlog</option>
                  <option value="Personal Development">个人成长</option>
                  <option value="Social Skills">社交技巧</option>
                  <option value="Communication">沟通技巧</option>
                  <option value="Psychology">心理</option>
                  <option value="TED">TED</option>
                  <option value="Interview">访谈</option>
                  <option value="Podcast">播客</option>
                  <option value="News">新闻</option>
                  <option value="Finance">财经</option>
                  <option value="Learning">学习</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  视频文件 *
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setFiles({ ...files, video: e.target.files?.[0] || null })}
                  className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  封面图片（可选）
                  <span className="text-gray-500 ml-2">留空则自动截取视频首帧</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFiles({ ...files, cover: e.target.files?.[0] || null })}
                  className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  英文字幕
                </label>
                <input
                  type="file"
                  accept=".srt,.vtt"
                  onChange={(e) => setFiles({ ...files, englishSubtitle: e.target.files?.[0] || null })}
                  className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  中文字幕
                </label>
                <input
                  type="file"
                  accept=".srt,.vtt"
                  onChange={(e) => setFiles({ ...files, chineseSubtitle: e.target.files?.[0] || null })}
                  className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  视频描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                  rows={3}
                  placeholder="视频内容简介..."
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={uploading}
                className="px-6 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>上传中...</span>
                  </>
                ) : (
                  '上传'
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                disabled={uploading}
                className="px-6 py-2 bg-surface text-gray-300 rounded-lg hover:bg-surface-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                取消
              </button>
            </div>

            {uploading && (
              <div className="mt-4 p-4 bg-accent/10 border border-accent/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-accent flex items-center gap-2">
                    <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span>
                    {uploadStatus || '正在上传...'}
                  </p>
                  <span className="text-sm text-accent font-semibold">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-primary transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  大文件上传可能需要几分钟，请勿关闭页面
                </p>
              </div>
            )}
          </form>
        </div>
      )}

      {/* 视频列表 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Film className="mx-auto mb-4" size={48} />
          <p>暂无视频，点击上方按钮上传第一个视频</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-400 px-2">
            <GripVertical size={16} />
            <span>拖拽视频卡片可调整显示顺序</span>
            {isReordering && <span className="text-accent ml-2">保存中...</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => {
              const coverUrl = getCoverUrl(video.coverPath)
              const isDragging = draggedItem === video.id
              return (
                <div
                  key={video.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, video.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, video.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-surface-light rounded-xl overflow-hidden transition-all cursor-move ${
                    isDragging ? 'opacity-50 scale-95' : 'hover:ring-2 hover:ring-accent'
                  }`}
                >
              <div className="relative">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={video.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-primary flex items-center justify-center">
                    <Film size={48} className="text-white/50" />
                  </div>
                )}
                {/* 拖拽手柄 */}
                <div className="absolute top-2 left-2 bg-black/50 rounded p-1.5 text-white/70 hover:text-white cursor-move">
                  <GripVertical size={16} />
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-heading font-semibold text-white mb-2 line-clamp-2">
                  {video.title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock size={16} />
                    {formatDuration(video.duration)}
                  </span>
                  <span className="px-2 py-1 bg-accent/20 text-accent rounded text-xs">
                    {video.difficulty}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>字幕: {video.subtitles.length} 个语言</span>
                  <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  {video.subtitles.length === 0 ? (
                    <button
                      onClick={() => handleGenerateSubtitles(video.id)}
                      disabled={generatingSubtitle}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity text-sm"
                    >
                      <Subtitles size={16} />
                      {generatingSubtitle && selectedVideoId === video.id ? '生成中...' : 'AI 生成字幕'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEditVideo(video)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-surface text-gray-300 rounded-lg hover:bg-surface-light transition-colors text-sm"
                    >
                      <Edit3 size={16} />
                      编辑
                    </button>
                  )}
                  <button
                    onClick={() => handleGenerateCover(video)}
                    disabled={generatingCover && generatingCoverVideoId === video.id}
                    className="px-3 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="重新生成封面"
                  >
                    <ImagePlus size={16} className={generatingCover && generatingCoverVideoId === video.id ? 'animate-pulse' : ''} />
                  </button>
                  <button
                    onClick={() => handleDeleteVideo(video.id)}
                    className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                    title="删除视频"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              </div>
            )
            })}
          </div>
        </div>
      )}

      {/* API Key 输入对话框 */}
      {showApiDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-light rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <Key className="text-accent" size={24} />
              <h3 className="text-xl font-heading font-semibold text-white">输入 API Key</h3>
            </div>

            <div className="mb-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  选择语音识别服务
                </label>
                <select
                  value={speechService}
                  onChange={(e) => setSpeechService(e.target.value as 'openai' | 'google' | 'local')}
                  className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent text-sm mb-3"
                >
                  <option value="local">🎯 本地 Whisper（完全免费，推荐！）</option>
                  <option value="openai">OpenAI Whisper ($0.006/分钟，无免费额度)</option>
                  <option value="google">Google Cloud Speech-to-Text ($0.004/分钟，需服务账号)</option>
                </select>
              </div>

              {speechService === 'local' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    选择模型大小（准确率 vs 速度）
                  </label>
                  <select
                    value={modelSize}
                    onChange={(e) => setModelSize(e.target.value as 'tiny' | 'base' | 'small' | 'medium' | 'large-v3')}
                    className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent text-sm"
                  >
                    <option value="tiny">Tiny - 85% 准确率，⚡ 最快（适合测试）</option>
                    <option value="base">Base - 88% 准确率，🚀 快</option>
                    <option value="small">Small - 92% 准确率，⏱️ 中等（推荐）</option>
                    <option value="medium">Medium - 94% 准确率，🐌 慢</option>
                    <option value="large-v3">Large-v3 - 98% 准确率，🐢 最慢</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 模型文件将下载到 D:\WhisperModels，节省 C 盘空间
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-400 mb-4">
                {speechService === 'local' ? (
                  <>
                    使用 <strong className="text-white">本地 Whisper</strong> 生成英文字幕，<strong className="text-white">百度翻译</strong> 翻译中文字幕。<br />
                    <strong className="text-green-400">✅ 完全免费，无需联网，模型缓存在 D 盘</strong>
                  </>
                ) : speechService === 'openai' ? (
                  <>
                    使用 <strong className="text-white">OpenAI Whisper</strong> 生成英文字幕，<strong className="text-white">百度翻译</strong> 翻译中文字幕。
                  </>
                ) : (
                  <>
                    使用 <strong className="text-white">Google Cloud Speech-to-Text</strong> 生成英文字幕，<strong className="text-white">百度翻译</strong> 翻译中文字幕。
                    <br />
                    <br />
                    ⚠️ <strong className="text-accent">Google Cloud 需要使用服务账号 JSON 文件</strong>，而不是 API Key。
                    <br />
                    请先在 Google Cloud Console 创建服务账号并下载 JSON 密钥文件。
                  </>
                )}
                <br />
                <br />
                <strong className="text-accent">百度翻译 API Key</strong>（用<strong className="text-accent">逗号</strong>分隔 APP_ID 和 SECRET_KEY）：
                <br />
                <span className="text-gray-300">{speechService === 'local' ? '百度 APP_ID,SECRET_KEY' : '云服务 Key, 百度 APP_ID,SECRET_KEY'}</span>
                {speechService !== 'local' && (
                  <>
                    <br />
                    <br />
                    {speechService === 'openai' ? (
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        获取 OpenAI Key →
                      </a>
                    ) : (
                      <a
                        href="https://console.cloud.google.com/iam-admin/serviceaccounts"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        创建 Google Cloud 服务账号 →
                      </a>
                    )}
                  </>
                )}
                {' | '}
                <a
                  href="https://fanyi-api.baidu.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  获取百度翻译 Key →
                </a>
              </p>
              {speechService === 'google' && (
                <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-yellow-400">
                    <strong>Google Cloud 配置步骤：</strong><br />
                    1. 访问 IAM 和管理 → 服务账号<br />
                    2. 创建服务账号，选择角色 "Cloud Speech-to-Text API 用户"<br />
                    3. 点击服务账号 → 密钥 → 添加密钥 → 创建新的密钥（JSON格式）<br />
                    4. 下载的 JSON 文件全部内容复制粘贴到下方输入框
                  </p>
                </div>
              )}
              {speechService === 'local' && (
                <div className="mb-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-xs text-green-400">
                    <strong>🎉 本地 Whisper 优势：</strong><br />
                    ✅ 完全免费，无 API 调用费用<br />
                    ✅ 隐私安全，视频无需上传<br />
                    ✅ 无网络限制，离线可用<br />
                    ✅ 准确率高达 98%（Large-v3 模型）<br />
                    ✅ 模型缓存在 D 盘，节省 C 盘空间
                  </p>
                </div>
              )}
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={speechService === 'local' ? "12345678,abcd1234" : speechService === 'openai' ? "sk-...,12345678,abcd1234" : '{ "type": "service_account", ... },12345678,abcd1234'}
                className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent text-sm"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 您的凭据仅用于此次调用，不会被保存
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmGenerateSubtitles}
                disabled={!apiKey.trim()}
                className="flex-1 px-4 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                开始生成
              </button>
              <button
                onClick={() => {
                  setShowApiDialog(false)
                  setApiKey('')
                  setSelectedVideoId(null)
                }}
                className="flex-1 px-4 py-2 bg-surface text-gray-300 rounded-lg hover:bg-surface-light transition-colors"
              >
                取消
              </button>
            </div>

            <div className="mt-4 p-3 bg-accent/10 border border-accent/30 rounded-lg">
              <p className="text-xs text-accent">
                ⚡ 提示：视频越长，生成时间越长。通常 1 分钟视频需要约 10 秒处理时间。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 生成字幕进度提示 */}
      {batchUpdateStatus && (
        <div className="fixed bottom-4 right-4 bg-surface-light border border-accent/30 rounded-xl p-4 shadow-xl max-w-sm w-80 z-50">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw size={18} className="text-accent animate-spin" />
            <p className="text-sm font-medium text-white">批量更新时长</p>
          </div>
          <p className="text-xs text-gray-400">{batchUpdateStatus}</p>
        </div>
      )}

      {generatingSubtitle && (
        <div className="fixed bottom-4 right-4 bg-surface-light border border-accent/30 rounded-xl p-4 shadow-xl max-w-sm w-80">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-white">AI 正在生成字幕...</p>
          </div>
          {uploadStatus && (
            <p className="text-xs text-gray-400 mb-2">{uploadStatus}</p>
          )}
          {uploadProgress > 0 && (
            <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-primary transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
          {uploadProgress > 0 && (
            <p className="text-xs text-accent mt-1 text-right">{uploadProgress}%</p>
          )}
        </div>
      )}

      {/* 编辑视频弹窗 */}
      {editingVideo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-light rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Edit3 className="text-accent" size={24} />
                <h3 className="text-xl font-heading font-semibold text-white">编辑视频</h3>
              </div>
              <button
                onClick={() => setEditingVideo(null)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateVideo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  视频标题 *
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    难度等级 *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={editFormData.difficulty}
                      onChange={(e) => setEditFormData({ ...editFormData, difficulty: e.target.value })}
                      className="flex-1 px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                    >
                      <option value="A1">A1 - 入门</option>
                      <option value="A2">A2 - 基础</option>
                      <option value="B1">B1 - 进阶</option>
                      <option value="B2">B2 - 中级</option>
                      <option value="C1">C1 - 高级</option>
                      <option value="C2">C2 - 精通</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAnalyzeDifficulty}
                      disabled={analyzingDifficulty || !editingVideo?.subtitles || editingVideo.subtitles.length === 0}
                      className="px-3 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
                      title="根据字幕内容自动分析难度"
                    >
                      <Sparkles size={16} />
                      {analyzingDifficulty ? '分析中...' : '自动识别'}
                    </button>
                  </div>
                  {(!editingVideo?.subtitles || editingVideo.subtitles.length === 0) && (
                    <p className="text-xs text-gray-500 mt-1">⚠️ 需要先上传字幕才能自动识别难度</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    分类
                  </label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                  >
                    <option value="">选择分类（可选）</option>
                    <option value="Vlog">Vlog</option>
                    <option value="Personal Development">个人成长</option>
                    <option value="Social Skills">社交技巧</option>
                    <option value="Communication">沟通技巧</option>
                    <option value="Psychology">心理</option>
                    <option value="TED">TED</option>
                    <option value="Interview">访谈</option>
                    <option value="Podcast">播客</option>
                    <option value="News">新闻</option>
                    <option value="Finance">财经</option>
                    <option value="Learning">学习</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  视频描述
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                  rows={4}
                  placeholder="视频内容简介..."
                />
              </div>

              <div className="bg-surface rounded-lg p-4 space-y-3">
                <div className="text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400">
                      <span className="font-medium text-white">视频时长：</span>
                      {formatDuration(editingVideo.duration)}
                    </p>
                    <button
                      type="button"
                      onClick={handleUpdateDuration}
                      disabled={updatingDuration}
                      className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Clock size={14} />
                      {updatingDuration ? '更新中...' : '更新时长'}
                    </button>
                  </div>
                  <p className="text-gray-400">
                    <span className="font-medium text-white">创建时间：</span>
                    {new Date(editingVideo.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* 字幕管理 */}
                <div className="border-t border-gray-700 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-white">
                      字幕语言：{editingVideo.subtitles.length} 个
                    </p>
                    {editingVideo.subtitles.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSubtitles(editingVideo.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-xs"
                      >
                        <Trash2 size={14} />
                        删除所有字幕
                      </button>
                    )}
                  </div>

                  {editingVideo.subtitles.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {editingVideo.subtitles.map((subtitle) => (
                        <span
                          key={subtitle.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded text-xs"
                        >
                          <Subtitles size={12} />
                          {subtitle.language === 'EN' ? '英文字幕' : '中文字幕'}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3 bg-surface-light rounded-lg">
                      <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                        <AlertCircle size={14} />
                        暂无字幕，可以点击"AI 生成字幕"来创建
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {updating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>更新中...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      保存更改
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  disabled={updating}
                  className="px-6 py-2 bg-surface text-gray-300 rounded-lg hover:bg-surface-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
