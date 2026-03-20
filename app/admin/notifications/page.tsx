'use client'

import { useState, useEffect } from 'react'
import { Bell, Send, Users, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react'

interface User {
  id: string
  username: string
  email: string
}

interface Notification {
  id: string
  title: string
  content: string
  type: string
  read: boolean
  createdAt: string
  user?: {
    username: string
  }
}

export default function NotificationsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info',
    targetUser: 'all' // 'all' or userId
  })

  useEffect(() => {
    fetchUsers()
    fetchRecentNotifications()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      if (data.success) {
        setUsers(data.data.users)
      }
    } catch (error) {
      console.error('获取用户列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentNotifications = async () => {
    try {
      const response = await fetch('/api/admin/notifications?limit=10')
      const data = await response.json()
      if (data.success) {
        setRecentNotifications(data.data.notifications)
      }
    } catch (error) {
      console.error('获取通知列表失败:', error)
    }
  }

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('请填写标题和内容')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (!data.success) {
        alert(data.error || '发送失败')
        return
      }

      alert(`通知已发送给 ${data.data.sentCount} 位用户！`)

      // 重置表单
      setFormData({
        title: '',
        content: '',
        type: 'info',
        targetUser: 'all'
      })

      // 刷新通知列表
      fetchRecentNotifications()
    } catch (error) {
      console.error('发送通知失败:', error)
      alert('发送通知失败')
    } finally {
      setSending(false)
    }
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      info: <Info size={16} />,
      warning: <AlertCircle size={16} />,
      success: <CheckCircle size={16} />,
      error: <XCircle size={16} />
    }
    return icons[type] || icons.info
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      info: 'bg-blue-500/10 text-blue-400',
      warning: 'bg-yellow-500/10 text-yellow-400',
      success: 'bg-green-500/10 text-green-400',
      error: 'bg-red-500/10 text-red-400'
    }
    return colors[type] || colors.info
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      info: '信息',
      warning: '警告',
      success: '成功',
      error: '错误'
    }
    return labels[type] || '信息'
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 发送通知表单 */}
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-white mb-2">
            发送通知
          </h1>
          <p className="text-gray-400">向用户发送系统通知</p>
        </div>

        <div className="bg-surface-light rounded-xl p-6">
          <form onSubmit={handleSendNotification} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                通知标题 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="输入通知标题"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                通知内容 *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                rows={6}
                placeholder="输入通知内容..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  通知类型
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                >
                  <option value="info">信息</option>
                  <option value="warning">警告</option>
                  <option value="success">成功</option>
                  <option value="error">错误</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  发送目标
                </label>
                <select
                  value={formData.targetUser}
                  onChange={(e) => setFormData({ ...formData, targetUser: e.target.value })}
                  className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                >
                  <option value="all">所有用户</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-surface rounded-lg p-4 text-sm">
              <p className="text-gray-400 flex items-center gap-2">
                <Users size={16} />
                <span>
                  {formData.targetUser === 'all'
                    ? `将发送给所有 ${users.length} 位用户`
                    : `将发送给指定用户`}
                </span>
              </p>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>发送中...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  发送通知
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* 最近发送的通知 */}
      <div>
        <div className="mb-8">
          <h2 className="text-2xl font-heading font-bold text-white mb-2">
            最近发送的通知
          </h2>
          <p className="text-gray-400">查看最近发送的通知记录</p>
        </div>

        <div className="bg-surface-light rounded-xl p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-400">加载中...</div>
          ) : recentNotifications.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Bell className="mx-auto mb-4" size={48} />
              <p>暂无通知记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="bg-surface rounded-lg p-4 hover:ring-2 hover:ring-accent transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${getTypeColor(notification.type)}`}>
                        {getTypeIcon(notification.type)}
                        {getTypeLabel(notification.type)}
                      </span>
                      {notification.read && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <CheckCircle size={12} />
                          已读
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <h4 className="text-white font-medium mb-1">{notification.title}</h4>
                  <p className="text-gray-400 text-sm line-clamp-2">{notification.content}</p>

                  {notification.user && (
                    <p className="text-xs text-gray-500 mt-2">
                      发送给：{notification.user.username}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
