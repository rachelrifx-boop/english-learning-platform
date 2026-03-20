'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Send, CheckCircle, Clock, AlertCircle, Filter } from 'lucide-react'

interface Feedback {
  id: string
  type: string
  subject: string
  message: string
  status: string
  replied: boolean
  reply?: string
  createdAt: string
  user: {
    id: string
    username: string
    email: string
  }
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all')
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    fetchFeedbacks()
  }, [filter])

  const fetchFeedbacks = async () => {
    try {
      const response = await fetch(`/api/admin/feedback?status=${filter}`)
      const data = await response.json()
      if (data.success) {
        setFeedbacks(data.data.feedbacks)
      }
    } catch (error) {
      console.error('获取反馈失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendReply = async () => {
    if (!selectedFeedback || !replyText.trim()) return

    setSendingReply(true)
    try {
      const response = await fetch(`/api/admin/feedback/${selectedFeedback.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText })
      })

      const data = await response.json()
      if (!data.success) {
        alert(data.error || '发送回复失败')
        return
      }

      alert('回复已发送！')
      setReplyText('')
      setSelectedFeedback(null)
      fetchFeedbacks()
    } catch (error) {
      console.error('发送回复失败:', error)
      alert('发送回复失败')
    } finally {
      setSendingReply(false)
    }
  }

  const handleUpdateStatus = async (feedbackId: string, status: string) => {
    setUpdatingStatus(true)
    try {
      const response = await fetch(`/api/admin/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      const data = await response.json()
      if (!data.success) {
        alert(data.error || '更新状态失败')
        return
      }

      fetchFeedbacks()
    } catch (error) {
      console.error('更新状态失败:', error)
      alert('更新状态失败')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      feedback: '用户反馈',
      bug: '错误报告',
      feature: '功能建议',
      other: '其他'
    }
    return labels[type] || type
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      feedback: 'bg-blue-500/10 text-blue-400',
      bug: 'bg-red-500/10 text-red-400',
      feature: 'bg-green-500/10 text-green-400',
      other: 'bg-gray-500/10 text-gray-400'
    }
    return colors[type] || colors.other
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待处理',
      reviewed: '已查看',
      resolved: '已解决'
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-400',
      reviewed: 'bg-blue-500/10 text-blue-400',
      resolved: 'bg-green-500/10 text-green-400'
    }
    return colors[status] || colors.pending
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-2">
            用户反馈管理
          </h1>
          <p className="text-gray-400">查看和回复用户反馈</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 bg-surface-light border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
          >
            <option value="all">全部</option>
            <option value="pending">待处理</option>
            <option value="reviewed">已查看</option>
            <option value="resolved">已解决</option>
          </select>
        </div>
      </div>

      {/* 反馈列表 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : feedbacks.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <MessageSquare className="mx-auto mb-4" size={48} />
          <p>暂无反馈</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((feedback) => (
            <div
              key={feedback.id}
              className="bg-surface-light rounded-xl p-6 hover:ring-2 hover:ring-accent transition-all cursor-pointer"
              onClick={() => setSelectedFeedback(feedback)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded text-xs ${getTypeColor(feedback.type)}`}>
                      {getTypeLabel(feedback.type)}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(feedback.status)}`}>
                      {getStatusLabel(feedback.status)}
                    </span>
                    {feedback.replied && (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle size={14} />
                        已回复
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-heading font-semibold text-white mb-1">
                    {feedback.subject}
                  </h3>
                  <p className="text-sm text-gray-400">
                    来自：{feedback.user.username} ({feedback.user.email})
                  </p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  {new Date(feedback.createdAt).toLocaleString()}
                </div>
              </div>

              <p className="text-gray-300 line-clamp-2">
                {feedback.message}
              </p>

              {feedback.reply && (
                <div className="mt-4 p-3 bg-accent/10 border border-accent/30 rounded-lg">
                  <p className="text-sm text-accent font-medium mb-1">管理员回复：</p>
                  <p className="text-sm text-gray-300">{feedback.reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 反馈详情弹窗 */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-light rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-heading font-semibold text-white">反馈详情</h3>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">类型</label>
                  <span className={`px-2 py-1 rounded text-sm ${getTypeColor(selectedFeedback.type)}`}>
                    {getTypeLabel(selectedFeedback.type)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">状态</label>
                  <select
                    value={selectedFeedback.status}
                    onChange={(e) => handleUpdateStatus(selectedFeedback.id, e.target.value)}
                    disabled={updatingStatus}
                    className="px-3 py-1 bg-surface border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-accent disabled:opacity-50"
                  >
                    <option value="pending">待处理</option>
                    <option value="reviewed">已查看</option>
                    <option value="resolved">已解决</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">主题</label>
                <p className="text-white">{selectedFeedback.subject}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">反馈内容</label>
                <p className="text-gray-300 whitespace-pre-wrap">{selectedFeedback.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">用户</label>
                  <p className="text-white">{selectedFeedback.user.username}</p>
                  <p className="text-gray-500">{selectedFeedback.user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">时间</label>
                  <p className="text-white">{new Date(selectedFeedback.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {selectedFeedback.reply && (
                <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg">
                  <p className="text-sm text-accent font-medium mb-1">之前的回复：</p>
                  <p className="text-sm text-gray-300">{selectedFeedback.reply}</p>
                </div>
              )}

              <div className="border-t border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">回复反馈</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                  rows={4}
                  placeholder="输入回复内容..."
                />
                <button
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="mt-3 flex items-center gap-2 px-6 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {sendingReply ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      发送中...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      发送回复
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
