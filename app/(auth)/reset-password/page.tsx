'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isValidToken, setIsValidToken] = useState(true)

  useEffect(() => {
    if (!token) {
      setIsValidToken(false)
      setError('无效的重置链接')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证密码
    if (!formData.password || formData.password.length < 6) {
      setError('密码长度至少6位')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setError('')
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: formData.password
        })
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || '重置失败')
        setLoading(false)
        return
      }

      setMessage('密码重置成功！正在跳转到登录页面...')

      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      console.error('请求错误:', err)
      setError('网络错误，请稍后重试')
      setLoading(false)
    }
  }

  if (!isValidToken) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-surface-light rounded-2xl p-8 shadow-2xl">
          <div className="text-center">
            <h1 className="text-2xl font-heading font-bold text-white mb-4">
              无效的重置链接
            </h1>
            <p className="text-gray-400 mb-6">该重置链接已失效或无效。</p>
            <Link
              href="/forgot-password"
              className="inline-block px-6 py-3 bg-gradient-primary text-white font-medium rounded-lg hover:opacity-90 transition-all"
            >
              重新获取重置链接
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-surface-light rounded-2xl p-8 shadow-2xl animate-scale-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-white mb-2">
            设置新密码
          </h1>
          <p className="text-gray-400">请输入您的新密码</p>
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
              新密码
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
              placeholder="至少6位字符"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              确认新密码
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
              placeholder="再次输入新密码"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-primary text-white font-medium rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-light disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? '重置中...' : '重置密码'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400">
          <Link href="/login" className="text-accent hover:text-accent-2 transition-colors">
            返回登录
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md">
        <div className="bg-surface-light rounded-2xl p-8 shadow-2xl">
          <div className="text-center text-gray-400">加载中...</div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
