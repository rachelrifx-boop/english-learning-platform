'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Mail, Lock, Save, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 表单状态
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()
      if (data.success) {
        setUser(data.data.user)
        setUsername(data.data.user.username || '')
        setEmail(data.data.user.email || '')
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email })
      })
      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: '个人信息更新成功！' })
        setUser({ ...user, username, email })
      } else {
        setMessage({ type: 'error', text: data.message || '更新失败，请重试' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '网络错误，请重试' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的密码不一致' })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '新密码长度至少为6位' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: '密码修改成功！' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setMessage({ type: 'error', text: data.message || '密码修改失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '网络错误，请重试' })
    } finally {
      setSaving(false)
    }
  }

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
                  账号设置
                </h1>
                <p className="text-xs text-gray-400 hidden sm:block">
                  管理你的个人信息和密码
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-2xl mx-auto px-4 sm:px-8 py-6">
        {/* 消息提示 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {/* 基本信息 */}
        <div className="bg-surface rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
              <User size={24} className="text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">基本信息</h2>
              <p className="text-sm text-gray-400">更新你的个人资料</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-surface-light border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="请输入用户名"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-surface-light border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="请输入邮箱"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? '保存中...' : '保存更改'}
            </button>
          </div>
        </div>

        {/* 修改密码 */}
        <div className="bg-surface rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-accent-2/20 rounded-full flex items-center justify-center">
              <Lock size={24} className="text-accent-2" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">修改密码</h2>
              <p className="text-sm text-gray-400">定期更换密码保护账号安全</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                当前密码
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 bg-surface-light border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="请输入当前密码"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                新密码
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-surface-light border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="请输入新密码（至少6位）"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                确认新密码
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-surface-light border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
                placeholder="请再次输入新密码"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              {showPassword ? '隐藏密码' : '显示密码'}
            </button>

            <button
              onClick={handleChangePassword}
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-accent-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Lock size={18} />
              {saving ? '修改中...' : '修改密码'}
            </button>
          </div>
        </div>

        {/* 账号信息 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>账号ID: {user?.id || 'N/A'}</p>
          <p className="mt-1">注册时间: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : 'N/A'}</p>
        </div>
      </main>
    </div>
  )
}
