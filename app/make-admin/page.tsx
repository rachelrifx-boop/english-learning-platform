'use client'

import { useState } from 'react'

export default function MakeAdminPage() {
  const [email, setEmail] = useState('admin@example.com')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleMakeAdmin = async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/make-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (data.success) {
        setMessage('✅ 成功！用户 ' + email + ' 已设置为管理员。请退出登录后重新登录。')
      } else {
        setMessage('❌ 错误：' + data.error)
      }
    } catch (error) {
      setMessage('❌ 网络错误：' + error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="bg-surface-light rounded-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-6">设置管理员</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              邮箱地址
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent"
              placeholder="请输入邮箱地址"
            />
          </div>

          <button
            onClick={handleMakeAdmin}
            disabled={loading}
            className="w-full py-3 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
          >
            {loading ? '处理中...' : '设置为管理员'}
          </button>

          {message && (
            <div className="p-4 rounded-lg bg-surface border border-gray-700">
              <p className="text-sm whitespace-pre-wrap">{message}</p>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            ⚠️ 这是一个临时管理页面，完成后建议删除此文件
          </p>
        </div>
      </div>
    </div>
  )
}
