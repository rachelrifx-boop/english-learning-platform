'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Ticket, Plus, Copy, Check } from 'lucide-react'

interface InviteCode {
  id: string
  code: string
  maxUses: number
  usedCount: number
  expiresAt: string | null
  createdAt: string
  _count: { users: number }
}

export default function InviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showGenerateForm, setShowGenerateForm] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const [generateForm, setGenerateForm] = useState({
    count: 1,
    maxUses: 1,
    expiresInDays: 1 // 默认1天
  })

  useEffect(() => {
    fetchCodes()
  }, [])

  const fetchCodes = async () => {
    try {
      const response = await fetch('/api/admin/invite-codes')
      const data = await response.json()
      if (data.success) {
        setCodes(data.data.codes)
      }
    } catch (error) {
      console.error('获取邀请码失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerating(true)

    try {
      const response = await fetch('/api/admin/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateForm)
      })

      const data = await response.json()

      if (!data.success) {
        alert(data.error || '生成失败')
        return
      }

      setShowGenerateForm(false)
      setGenerateForm({ count: 1, maxUses: 1, expiresInDays: 1 })
      fetchCodes()
    } catch (error) {
      console.error('生成邀请码失败:', error)
      alert('生成失败，请稍后重试')
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-2">
            邀请码管理
          </h1>
          <p className="text-gray-400">生成和管理注册邀请码</p>
        </div>
        <button
          onClick={() => setShowGenerateForm(!showGenerateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus size={20} />
          生成邀请码
        </button>
      </div>

      {/* 生成表单 */}
      {showGenerateForm && (
        <div className="bg-surface-light rounded-xl p-6 mb-8 animate-slide-up">
          <h2 className="text-xl font-heading font-semibold text-white mb-4">生成邀请码</h2>
          <form onSubmit={handleGenerate} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                生成数量
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={generateForm.count}
                onChange={(e) => setGenerateForm({ ...generateForm, count: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                每个码使用次数
              </label>
              <input
                type="number"
                min="1"
                value={generateForm.maxUses}
                onChange={(e) => setGenerateForm({ ...generateForm, maxUses: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                有效期
              </label>
              <select
                value={generateForm.expiresInDays}
                onChange={(e) => setGenerateForm({ ...generateForm, expiresInDays: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent"
              >
                <option value="1">1天</option>
                <option value="3">3天</option>
                <option value="7">7天</option>
                <option value="30">30天</option>
                <option value="0">永久有效</option>
              </select>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={generating}
                className="px-6 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {generating ? '生成中...' : '生成'}
              </button>
              <button
                type="button"
                onClick={() => setShowGenerateForm(false)}
                className="px-6 py-2 bg-surface text-gray-300 rounded-lg hover:bg-surface-light transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 邀请码列表 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : codes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Ticket className="mx-auto mb-4" size={48} />
          <p>暂无邀请码，点击上方按钮生成</p>
        </div>
      ) : (
        <div className="bg-surface-light rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">邀请码</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">使用情况</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">有效期</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">状态</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">创建时间</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {codes.map((code) => {
                  const isUsedUp = code.usedCount >= code.maxUses
                  const isExpired = code.expiresAt && new Date(code.expiresAt) < new Date()
                  const isUnavailable = isUsedUp || isExpired

                  return (
                    <tr key={code.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-6 py-4">
                        <code className="text-accent font-mono">{code.code}</code>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {code.usedCount} / {code.maxUses}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {code.expiresAt
                          ? new Date(code.expiresAt).toLocaleDateString()
                          : '永久有效'}
                      </td>
                      <td className="px-6 py-4">
                        {isUsedUp ? (
                          <span className="px-2 py-1 bg-red-500/20 text-red-500 rounded text-xs">
                            已用完
                          </span>
                        ) : isExpired ? (
                          <span className="px-2 py-1 bg-red-500/20 text-red-500 rounded text-xs">
                            已过期
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-500/20 text-green-500 rounded text-xs">
                            可用
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {new Date(code.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => copyToClipboard(code.code)}
                          className="p-2 hover:bg-surface rounded-lg transition-colors"
                          title="复制邀请码"
                        >
                          {copiedCode === code.code ? (
                            <Check size={18} className="text-green-500" />
                          ) : (
                            <Copy size={18} className="text-gray-400" />
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
