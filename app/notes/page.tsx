'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Trash2, Video, Clock, Calendar } from 'lucide-react'
import Link from 'next/link'

export default function NotesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.data.user)
        await fetchNotes()
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }

  const fetchNotes = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notes')
      const data = await response.json()
      if (data.success) {
        setNotes(data.data.notes)
      }
    } catch (error) {
      console.error('获取笔记失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('确定要删除这条笔记吗？')) return

    try {
      const response = await fetch(`/api/notes?id=${noteId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotes(notes.filter(note => note.id !== noteId))
        alert('删除成功')
      }
    } catch (error) {
      console.error('删除笔记失败:', error)
    }
  }

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 按视频分组笔记
  const groupedNotes = notes.length > 0 ? notes.reduce<Record<string, typeof notes>>((acc, note) => {
    const videoId = note.videoId
    if (!acc[videoId]) {
      acc[videoId] = []
    }
    acc[videoId].push(note)
    return acc
  }, {}) : {}

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* 顶部导航 */}
      <header className="bg-surface-light border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-300 hover:text-accent transition-colors"
            >
              <ArrowLeft size={20} />
              返回首页
            </Link>
            <h1 className="text-xl font-heading font-semibold text-white">学习笔记</h1>
            <div className="ml-auto">
              <span className="text-sm text-gray-400">共 {notes.length} 条笔记</span>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {notes.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={64} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">还没有笔记</h3>
            <p className="text-gray-400 mb-6">在观看视频时点击"笔记"按钮记录你的学习心得</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              开始学习
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedNotes).map(([videoId, videoNotes]) => {
                const videoNotesArray = videoNotes as any[]
                return (
                  <div key={videoId} className="bg-surface-light rounded-xl p-6">
                    {/* 视频信息 */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Video size={20} className="text-accent" />
                          <h3 className="text-lg font-semibold text-white">
                            {notes[0]?.video?.title || '未知视频'}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-400">
                        {notes.length} 条笔记
                      </p>
                    </div>
                    <Link
                      href={`/videos/${videoId}`}
                      className="px-4 py-2 bg-surface text-gray-300 rounded-lg hover:bg-surface-light transition-colors text-sm"
                    >
                      查看视频
                    </Link>
                  </div>

                  {/* 笔记列表 */}
                  <div className="space-y-4">
                    {notes.map((note: any) => (
                      <div
                        key={note.id}
                        className="bg-surface rounded-lg p-4 border border-gray-700 hover:border-accent transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            {/* 时间戳和字幕 */}
                            {note.subtitleText && (
                              <div className="mb-2 p-2 bg-blue-500/10 rounded">
                                <p className="text-sm text-gray-300 italic mb-1">
                                  &quot;{note.subtitleText}&quot;
                                </p>
                                <div className="flex items-center gap-2 text-xs text-accent">
                                  <Clock size={12} />
                                  <span>{formatTimestamp(note.timestamp)}</span>
                                </div>
                              </div>
                            )}

                            {/* 笔记内容 */}
                            <p className="text-gray-200">{note.text}</p>
                          </div>

                          {/* 操作按钮 */}
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="删除笔记"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* 创建时间 */}
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar size={12} />
                          <span>{formatDate(note.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )
              })}
          </div>
        )}
      </main>
    </div>
  )
}
