'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MessageCircle, Send, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

type FeedbackType = 'bug' | 'feature' | 'content' | 'other'

export default function FeedbackPage() {
  const router = useRouter()
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('other')
  const [content, setContent] = useState('')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const feedbackTypes: { value: FeedbackType, label: string, icon: string }[] = [
    { value: 'bug', label: '功能异常', icon: '🐛' },
    { value: 'feature', label: '功能建议', icon: '💡' },
    { value: 'content', label: '内容问题', icon: '📝' },
    { value: 'other', label: '其他', icon: '💬' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      return
    }

    setSubmitting(true)

    try {
      // 这里可以调用后端API提交反馈
      // const response = await fetch('/api/feedback', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ type: feedbackType, content, contact })
      // })

      // 模拟提交
      await new Promise(resolve => setTimeout(resolve, 1000))

      setSubmitted(true)

      // 3秒后返回首页
      setTimeout(() => {
        router.push('/')
      }, 3000)
    } catch (error) {
      console.error('提交反馈失败:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center px-4">
        <div className="bg-surface rounded-xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">感谢您的反馈！</h2>
          <p className="text-gray-400">我们会认真处理您的意见，3秒后返回首页...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* 顶部导航 */}
      <header className="bg-surface-light border-b border-gray-800 sticky top-0 z-40">
        <div className="px-4 sm:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 text-gray-300 hover:text-white hover:bg-surface rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-heading font-bold text-white">
                  意见反馈
                </h1>
                <p className="text-xs text-gray-400 hidden sm:block">
                  帮助我们做得更好
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-accent">
              <MessageCircle size={20} />
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-2xl mx-auto px-4 sm:px-8 py-6">
        <div className="bg-surface rounded-xl p-6">
          <form onSubmit={handleSubmit}>
            {/* 反馈类型 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                反馈类型
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {feedbackTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFeedbackType(type.value)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      feedbackType === type.value
                        ? 'border-accent bg-accent/20 text-white'
                        : 'border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className="text-sm">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 反馈内容 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                反馈内容 <span className="text-red-400">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-surface-light border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
                placeholder="请详细描述您遇到的问题或建议..."
                required
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {content.length} 字
              </div>
            </div>

            {/* 联系方式 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                联系方式（可选）
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full px-4 py-3 bg-surface-light border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                placeholder="邮箱或微信，方便我们联系您"
              />
            </div>

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-accent to-accent-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
              {submitting ? '提交中...' : '提交反馈'}
            </button>
          </form>
        </div>

        {/* 常见问题 */}
        <div className="mt-6 bg-surface rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">常见问题</h3>
          <div className="space-y-3 text-sm">
            <div className="text-gray-400">
              <span className="text-gray-300 font-medium">Q: 视频无法播放？</span>
              <p className="mt-1">A: 请检查网络连接，或尝试刷新页面。</p>
            </div>
            <div className="text-gray-400">
              <span className="text-gray-300 font-medium">Q: 如何收藏视频？</span>
              <p className="mt-1">A: 点击视频卡片上的爱心图标即可收藏。</p>
            </div>
            <div className="text-gray-400">
              <span className="text-gray-300 font-medium">Q: 如何修改个人信息？</span>
              <p className="mt-1">A: 点击右上角设置图标，进入账号设置页面。</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
