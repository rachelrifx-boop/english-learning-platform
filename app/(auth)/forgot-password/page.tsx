'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址')
      return
    }

    setError('')
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || '发送失败')
        setLoading(false)
        return
      }

      setMessage('如果该邮箱已注册，您将收到一封包含重置链接的邮件。请注意查收。')
    } catch (err) {
      console.error('请求错误:', err)
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-surface-light rounded-2xl p-8 shadow-2xl animate-scale-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-white mb-2">
            忘记密码
          </h1>
          <p className="text-gray-400">输入您的邮箱，我们将发送重置链接</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-3 rounded-lg">
              {message}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              邮箱地址
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
              placeholder="your@email.com"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-primary text-white font-medium rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-light disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? '发送中...' : '发送重置链接'}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center">
          <Link
            href="/login"
            className="block text-accent hover:text-accent-2 transition-colors"
          >
            返回登录
          </Link>
          <p className="text-gray-400">
            还没有账号？{' '}
            <Link href="/register" className="text-accent hover:text-accent-2 transition-colors">
              立即注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
