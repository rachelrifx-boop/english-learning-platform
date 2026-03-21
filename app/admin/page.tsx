'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Film, Upload, Trash2, Clock, Subtitles, Key, Edit3, X, Save, AlertCircle, Sparkles } from 'lucide-react'

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
}

export default function AdminPage() {
  const router = useRouter()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
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
    setUploading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('title', formData.title)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('category', formData.category)

      if (files.video) formDataToSend.append('video', files.video)
      if (files.cover) formDataToSend.append('cover', files.cover)
      if (files.englishSubtitle) formDataToSend.append('englishSubtitle', files.englishSubtitle)
      if (files.chineseSubtitle) formDataToSend.append('chineseSubtitle', files.chineseSubtitle)

      // 添加超时控制（60秒）
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)

      const response = await fetch('/api/admin/videos', {
        method: 'POST',
        body: formDataToSend,
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const data = await response.json()

      if (!data.success) {
        alert(data.error || '上传失败')
        setUploading(false)
        return
      }

      // 上传成功
      alert('上传成功！')

      // 重置表单
      setFormData({ title: '', description: '', category: '' })
      setFiles({ video: null, cover: null, englishSubtitle: null, chineseSubtitle: null })
      setShowUploadForm(false)
      fetchVideos()
    } catch (error: any) {
      console.error('上传失败:', error)
      if (error.name === 'AbortError') {
        alert('上传超时，请检查网络连接或稍后重试')
      } else {
        alert('上传失败：' + (error.message || '请稍后重试'))
      }
    } finally {
      setUploading(false)
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

    if (speechService !== 'local' && !apiKey.trim()) {
      alert(`请输入 ${speechService === 'openai' ? 'OpenAI' : 'Google Cloud'} API Key 和百度翻译 Key（用逗号分隔）`)
      return
    }

    if (speechService === 'local' && !apiKey.trim()) {
      alert('请输入百度翻译 API Key（APP_ID,SECRET_KEY）')
      return
    }

    setGeneratingSubtitle(true)
    setShowApiDialog(false)

    try {
      const response = await fetch('/api/admin/generate-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: selectedVideoId,
          apiKey: apiKey.trim(),
          speechService: speechService,
          modelSize: speechService === 'local' ? modelSize : undefined
        })
      })

      const data = await response.json()

      if (!data.success) {
        alert(data.error || '生成字幕失败')
        return
      }

      alert('字幕生成成功！')
      fetchVideos()
    } catch (error: any) {
      console.error('生成字幕失败:', error)
      alert('生成字幕失败：' + (error.message || '请稍后重试'))
    } finally {
      setGeneratingSubtitle(false)
      setSelectedVideoId(null)
      setApiKey('')
    }
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-2">
            视频管理
          </h1>
          <p className="text-gray-400">上传和管理课程视频</p>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <Upload size={20} />
          上传视频
        </button>
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
                  <option value="Personal Development">个人成长</option>
                  <option value="Social Skills">社交技巧</option>
                  <option value="Communication">沟通技巧</option>
                  <option value="Daily Life">日常生活</option>
                  <option value="Health & Fitness">健康健身</option>
                  <option value="Business">商务</option>
                  <option value="Career">职业发展</option>
                  <option value="Technology">科技</option>
                  <option value="Education">教育</option>
                  <option value="Science">科学</option>
                  <option value="Entertainment">娱乐</option>
                  <option value="Culture">文化</option>
                  <option value="Travel">旅行</option>
                  <option value="Food & Cooking">美食烹饪</option>
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
                  封面图片
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
              <div className="mt-4 p-3 bg-accent/10 border border-accent/30 rounded-lg">
                <p className="text-sm text-accent flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span>
                  正在上传视频，请稍候...（大型视频可能需要较长时间）
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="bg-surface-light rounded-xl overflow-hidden hover:ring-2 hover:ring-accent transition-all"
            >
              {video.coverPath ? (
                <img
                  src={video.coverPath}
                  alt={video.title}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gradient-primary flex items-center justify-center">
                  <Film size={48} className="text-white/50" />
                </div>
              )}
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
                    onClick={() => handleDeleteVideo(video.id)}
                    className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                    title="删除视频"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
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
      {generatingSubtitle && (
        <div className="fixed bottom-4 right-4 bg-surface-light border border-accent/30 rounded-xl p-4 shadow-xl max-w-sm">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
            <div>
              <p className="text-sm font-medium text-white">AI 正在生成字幕...</p>
              <p className="text-xs text-gray-400 mt-1">这可能需要几分钟，请勿关闭页面</p>
            </div>
          </div>
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
                    <option value="Personal Development">个人成长</option>
                    <option value="Social Skills">社交技巧</option>
                    <option value="Communication">沟通技巧</option>
                    <option value="Daily Life">日常生活</option>
                    <option value="Health & Fitness">健康健身</option>
                    <option value="Business">商务</option>
                    <option value="Career">职业发展</option>
                    <option value="Technology">科技</option>
                    <option value="Education">教育</option>
                    <option value="Science">科学</option>
                    <option value="Entertainment">娱乐</option>
                    <option value="Culture">文化</option>
                    <option value="Travel">旅行</option>
                    <option value="Food & Cooking">美食烹饪</option>
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
                  <p className="text-gray-400">
                    <span className="font-medium text-white">视频时长：</span>
                    {formatDuration(editingVideo.duration)}
                  </p>
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
