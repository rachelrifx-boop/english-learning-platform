'use client'

import { useState } from 'react'

export default function TestLoginPage() {
  const [result, setResult] = useState('')
  const [email, setEmail] = useState('rachel-rifx@outlook.com')
  const [password, setPassword] = useState('onsay2024')

  const testLogin = async () => {
    setResult('正在测试...')

    const payload = { email, password }

    console.log('发送的数据:', JSON.stringify(payload, null, 2))

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      console.log('响应状态:', response.status)
      console.log('响应头:', [...response.headers.entries()])

      const data = await response.json()
      console.log('响应数据:', data)

      setResult(JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('错误:', error)
      setResult('错误: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const testDirectAPI = async () => {
    setResult('正在测试直接 API...')

    try {
      const response = await fetch('https://onsaylab.cn/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()
      setResult('直接 API 结果:\n' + JSON.stringify(data, null, 2))
    } catch (error) {
      setResult('错误: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>登录测试页面</h1>

      <div style={{ marginBottom: '20px' }}>
        <label>邮箱:</label>
        <input
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '8px', margin: '5px 0' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label>密码:</label>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '8px', margin: '5px 0' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={testLogin} style={{ padding: '10px 20px', marginRight: '10px' }}>
          测试登录 API (/api/auth/login)
        </button>
        <button onClick={testDirectAPI} style={{ padding: '10px 20px' }}>
          测试完整 URL (https://onsaylab.cn/api/auth/login)
        </button>
      </div>

      <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '5px' }}>
        <h3>结果:</h3>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {result || '点击按钮开始测试'}
        </pre>
      </div>

      <div style={{ marginTop: '20px', padding: '10px', background: '#fff3cd', borderRadius: '5px' }}>
        <p><strong>说明：</strong></p>
        <ol>
          <li>打开浏览器开发者工具（F12）</li>
          <li>查看 Console 标签中的日志</li>
          <li>点击上面的测试按钮</li>
          <li>把结果截图发给我</li>
        </ol>
      </div>
    </div>
  )
}
