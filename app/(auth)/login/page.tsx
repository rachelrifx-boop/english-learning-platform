'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 检查 URL 参数，显示邀请码过期提示
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'invite_expired') {
      setError('您的邀请码已过期，请联系管理员获取新邀请码')
    }
  }, [searchParams])

  const handleSubmit = async () => {
    // 验证必填字段
    if (!formData.email || !formData.password) {
      setError('请填写邮箱和密码')
      return
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('请输入有效的邮箱地址')
      return
    }

    setError('')
    setLoading(true)

    console.log('[LOGIN PAGE] 表单提交:', { email: formData.email })

    try {
      console.log('[LOGIN PAGE] 开始发送请求到 /api/auth/login')
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      console.log('[LOGIN PAGE] 收到响应:', response.status, response.statusText)

      const data = await response.json()
      console.log('[LOGIN PAGE] 响应数据:', data)

      if (!data.success) {
        setError(data.error || '登录失败')
        setLoading(false)
        return
      }

      console.log('[LOGIN PAGE] 登录成功，跳转到首页')
      router.push('/')
      router.refresh()
    } catch (err) {
      console.error('[LOGIN PAGE] 请求错误:', err)
      setError('网络错误，请稍后重试')
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    console.log('[LOGIN PAGE] 输入变化:', field, value)
    setFormData({ ...formData, [field]: value })
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-surface-light rounded-2xl p-8 shadow-2xl animate-scale-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-white mb-2">
            欢迎回来
          </h1>
          <p className="text-gray-400">登录您的英语学习账号</p>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              邮箱
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
              placeholder="your@email.com"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">
                密码
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-accent hover:text-accent-2 transition-colors"
              >
                忘记密码？
              </Link>
            </div>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
              placeholder="••••••••"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="w-full py-3 px-4 bg-gradient-primary text-white font-medium rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-light disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </div>

        <p className="mt-6 text-center text-gray-400">
          还没有账号？{' '}
          <Link href="/register" className="text-accent hover:text-accent-2 transition-colors">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  )
}
