'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Mail, User, FileText, CheckCircle } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const observerRefs = useRef<(HTMLElement | null)[]>([])
  const [isNavScrolled, setIsNavScrolled] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    reason: ''
  })
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  useEffect(() => {
    // 导航栏滚动效果
    const handleScroll = () => {
      setIsNavScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)

    // Intersection Observer 动画
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-visible')
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    observerRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      observer.disconnect()
    }
  }, [])

  const addToObserver = (el: HTMLElement | null) => {
    if (el) observerRefs.current.push(el)
  }

  const openInviteModal = () => setShowInviteModal(true)
  const closeInviteModal = () => {
    setShowInviteModal(false)
    setSubmitStatus('idle')
    setErrorMessage('')
    setInviteCode('')
    setFormState({ name: '', email: '', reason: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitStatus('submitting')
    setErrorMessage('')

    try {
      const response = await fetch('/api/invite-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState)
      })

      const data = await response.json()

      if (data.success) {
        setSubmitStatus('success')
        setInviteCode(data.data?.code || '')
      } else {
        setSubmitStatus('error')
        setErrorMessage(data.error || '提交失败，请稍后重试')
      }
    } catch (error) {
      setSubmitStatus('error')
      setErrorMessage('网络错误，请稍后重试')
    }
  }

  const features = [
    {
      emoji: '🎬',
      title: '中英双语字幕',
      description: '视频播放同步显示中英对照，点击句子精准跳转'
    },
    {
      emoji: '🔊',
      title: '单词点读',
      description: '点击单词查看音标、词义、例句、搭配词、近反义词'
    },
    {
      emoji: '🎨',
      title: '词性彩色标注',
      description: '名词/动词/形容词/副词自动着色，词性一目了然'
    },
    {
      emoji: '🎧',
      title: '单句精听模式',
      description: '设定倍速与循环间隔，单句反复精听直到完全听清'
    },
    {
      emoji: '✍️',
      title: '单句听写模式',
      description: '隐藏字幕自测听写，提交后即时标红纠错'
    },
    {
      emoji: '🎤',
      title: '录音跟读',
      description: '跟读录音后即时回放对比，感受发音差距'
    },
    {
      emoji: '📇',
      title: '单词卡片',
      description: '收藏生词生成翻转卡片，随时复习'
    },
    {
      emoji: '💬',
      title: '表达卡片',
      description: '收藏整句地道表达，附中文翻译与时间戳'
    },
    {
      emoji: '🖨️',
      title: '字幕打印',
      description: '一键导出中英对照字幕 PDF，离线复习'
    },
    {
      emoji: '👁️',
      title: '专注模式',
      description: '隐藏视频只听音频，减少视觉干扰'
    }
  ]

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700;800&display=swap');

        :root {
          --color-primary: #2563EB;
          --color-accent: #7C3AED;
          --color-bg: #FFFFFF;
          --color-bg-alt: #F8F9FC;
          --color-text-title: #0F172A;
          --color-text-body: #475569;
          --color-text-muted: #94A3B8;
          --color-border: #E2E8F0;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: var(--color-text-body);
          background: var(--color-bg);
          line-height: 1.6;
        }

        .font-heading {
          font-family: 'Outfit', sans-serif;
        }

        /* 滚动动画 */
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }

        .animate-visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* 延迟动画 */
        .delay-100 { transition-delay: 0.1s; }
        .delay-200 { transition-delay: 0.2s; }
        .delay-300 { transition-delay: 0.3s; }
        .delay-400 { transition-delay: 0.4s; }
        .delay-500 { transition-delay: 0.5s; }

        /* 弹窗动画 */
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-backdrop {
          animation: modalFadeIn 0.2s ease-out;
        }
        .modal-content {
          animation: modalSlideIn 0.3s ease-out;
        }

        /* 禁用滚动 */
        body.modal-open {
          overflow: hidden;
        }
      `}</style>

      {/* 导航栏 */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isNavScrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-white'
      }`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="font-heading font-semibold text-lg text-[#0F172A]">English Learning</span>
          </div>
          <button
            onClick={openInviteModal}
            className="px-5 py-2.5 bg-[#2563EB] text-white text-sm font-medium rounded-full hover:bg-[#1D4ED8] transition-colors"
          >
            申请邀请码
          </button>
        </div>
        <div className="h-px bg-[#E2E8F0]"></div>
      </nav>

      {/* Hero 区块 */}
      <section className="min-h-screen flex items-center justify-center pt-20 pb-16 px-6 relative overflow-hidden">
        {/* 背景光晕 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#2563EB] rounded-full blur-[120px] opacity-[0.08]"></div>
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-[#7C3AED] rounded-full blur-[100px] opacity-[0.06]"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10" ref={addToObserver}>
          {/* 标签 */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#2563EB]/30 bg-[#2563EB]/5 mb-8 animate-on-scroll">
            <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse"></span>
            <span className="text-sm font-medium text-[#2563EB]">邀请制 · 内容精选</span>
          </div>

          {/* 主标题 */}
          <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-[#0F172A] leading-tight mb-6 animate-on-scroll delay-100">
            沉浸式英语学习
            <br />
            <span className="text-[#2563EB]">从听懂每一句开始</span>
          </h1>

          {/* 副标题 */}
          <p className="text-lg md:text-xl text-[#475569] mb-10 max-w-2xl mx-auto animate-on-scroll delay-200">
            视频 + 双语字幕 + 精细功能
            <br />
            让真实英语内容成为你最好的老师
          </p>

          {/* CTA 按钮 */}
          <button
            onClick={openInviteModal}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#2563EB] text-white font-semibold rounded-full hover:bg-[#1D4ED8] hover:shadow-lg hover:shadow-[#2563EB]/25 transition-all animate-on-scroll delay-300"
          >
            申请邀请码
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>
      </section>

      {/* 功能预览图区块 */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto" ref={addToObserver}>
          <div className="text-center mb-16 animate-on-scroll">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">
              一个页面，完整的学习闭环
            </h2>
            <p className="text-[#475569] text-lg">从听懂到开口，所有工具都在这里</p>
          </div>

          {/* 模拟浏览器窗口 */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl shadow-[#0F172A]/8 overflow-hidden animate-on-scroll delay-100">
            {/* 窗口顶部 */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#F8F9FC] border-b border-[#E2E8F0]">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
                <div className="w-3 h-3 rounded-full bg-[#F59E0B]"></div>
                <div className="w-3 h-3 rounded-full bg-[#22C55E]"></div>
              </div>
              <div className="flex-1 mx-4">
                <div className="max-w-md mx-auto bg-white rounded-md px-4 py-2 text-xs text-[#94A3B8] text-center">
                  english-learning.app
                </div>
              </div>
            </div>

            {/* 窗口内容 */}
            <div className="flex flex-col lg:flex-row">
              {/* 左侧视频区 */}
              <div className="lg:w-3/5 bg-[#1E293B] p-8 flex items-center justify-center min-h-[300px]">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  {/* 进度条 */}
                  <div className="w-64 h-1 bg-white/20 rounded-full mx-auto overflow-hidden">
                    <div className="w-1/3 h-full bg-[#2563EB] rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* 右侧字幕区 */}
              <div className="lg:w-2/5 bg-white p-6">
                <div className="space-y-3">
                  {/* 模拟字幕行 */}
                  <div className="flex gap-3">
                    <span className="text-xs text-[#94A3B8] w-8 shrink-0">0:15</span>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-[#F1F5F9] rounded"></div>
                      <div className="h-4 bg-[#F1F5F9] rounded w-3/4"></div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xs text-[#94A3B8] w-8 shrink-0">0:18</span>
                    <div className="flex-1 p-3 bg-[#2563EB]/5 border border-[#2563EB]/20 rounded-lg">
                      <div className="h-4 bg-[#2563EB] rounded mb-2 w-full"></div>
                      <div className="h-4 bg-[#2563EB]/60 rounded w-2/3"></div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xs text-[#94A3B8] w-8 shrink-0">0:22</span>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-[#F1F5F9] rounded"></div>
                      <div className="h-4 bg-[#F1F5F9] rounded w-5/6"></div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xs text-[#94A3B8] w-8 shrink-0">0:26</span>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-[#F1F5F9] rounded"></div>
                      <div className="h-4 bg-[#F1F5F9] rounded w-4/5"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 功能标签 */}
          <div className="flex flex-wrap justify-center gap-6 mt-12 animate-on-scroll delay-200">
            <div className="flex items-center gap-2 px-4 py-2 bg-[#F8F9FC] rounded-full">
              <span>🎬</span>
              <span className="text-sm font-medium text-[#475569]">视频播放器</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[#F8F9FC] rounded-full">
              <span>📝</span>
              <span className="text-sm font-medium text-[#475569]">双语字幕面板</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[#F8F9FC] rounded-full">
              <span>🔊</span>
              <span className="text-sm font-medium text-[#475569]">单词点读</span>
            </div>
          </div>
        </div>
      </section>

      {/* 核心功能区块 */}
      <section className="py-24 px-6 bg-[#F8F9FC]">
        <div className="max-w-6xl mx-auto" ref={addToObserver}>
          <div className="text-center mb-16 animate-on-scroll">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">
              为认真学英语的人设计
            </h2>
            <p className="text-[#475569] text-lg">10个精细功能，覆盖听说读写全场景</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group bg-white rounded-2xl p-6 border border-[#E2E8F0] hover:border-[#2563EB] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-on-scroll delay-${(index % 5) * 100}`}
                ref={(el) => { if (el) observerRefs.current.push(el) }}
              >
                <div className="text-4xl mb-4">{feature.emoji}</div>
                <h3 className="font-heading font-semibold text-lg text-[#0F172A] mb-2">
                  {feature.title}
                </h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 使用流程区块 */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto" ref={addToObserver}>
          <div className="text-center mb-16 animate-on-scroll">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">
              三步开始学习
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
            {/* 步骤 1 */}
            <div className="text-center animate-on-scroll delay-100">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#2563EB] flex items-center justify-center">
                <span className="font-heading font-bold text-2xl text-white">1</span>
              </div>
              <h3 className="font-heading font-semibold text-xl text-[#0F172A] mb-2">
                申请邀请码
              </h3>
              <p className="text-[#475569] text-sm">
                填写表单获取免费邀请码
              </p>
            </div>

            {/* 箭头 */}
            <div className="hidden md:flex items-center justify-center animate-on-scroll delay-200">
              <svg className="w-12 h-12 text-[#E2E8F0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>

            {/* 步骤 2 */}
            <div className="text-center animate-on-scroll delay-200">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#2563EB] flex items-center justify-center">
                <span className="font-heading font-bold text-2xl text-white">2</span>
              </div>
              <h3 className="font-heading font-semibold text-xl text-[#0F172A] mb-2">
                注册账号
              </h3>
              <p className="text-[#475569] text-sm">
                使用邀请码完成注册
              </p>
            </div>

            {/* 箭头 */}
            <div className="hidden md:flex items-center justify-center animate-on-scroll delay-300">
              <svg className="w-12 h-12 text-[#E2E8F0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>

            {/* 步骤 3 */}
            <div className="text-center animate-on-scroll delay-300">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#7C3AED] flex items-center justify-center">
                <span className="font-heading font-bold text-2xl text-white">3</span>
              </div>
              <h3 className="font-heading font-semibold text-xl text-[#0F172A] mb-2">
                开始学习
              </h3>
              <p className="text-[#475569] text-sm">
                选择视频，沉浸式学习
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA 区块 */}
      <section className="py-24 px-6 bg-[#0F172A]" ref={addToObserver}>
        <div className="max-w-3xl mx-auto text-center animate-on-scroll">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">
            准备好开始了吗？
          </h2>
          <p className="text-[#94A3B8] text-lg mb-10">
            邀请制，内容精选，保持学习质量
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={openInviteModal}
              className="px-8 py-4 bg-white text-[#0F172A] font-semibold rounded-full hover:bg-[#F8F9FC] transition-colors"
            >
              立即申请邀请码
            </button>
            <span className="text-[#94A3B8] text-sm">
              或发送邮件至 hello@example.com
            </span>
          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="py-8 px-6 bg-[#0F172A] border-t border-[#1E293B]">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[#475569] text-sm">
            English Learning © 2025 · 用心打造
          </p>
        </div>
      </footer>

      {/* 申请邀请码弹窗 */}
      {showInviteModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 modal-backdrop"
            onClick={closeInviteModal}
          ></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-2xl w-full max-w-md p-8 modal-content pointer-events-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 关闭按钮 */}
              <button
                onClick={closeInviteModal}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F8F9FC] transition-colors"
              >
                <X size={18} className="text-[#94A3B8]" />
              </button>

              {submitStatus === 'success' ? (
                /* 成功状态 */
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle size={32} className="text-green-600" />
                  </div>
                  <h3 className="font-heading text-2xl font-bold text-[#0F172A] mb-2">
                    申请成功！
                  </h3>
                  <p className="text-[#475569] mb-6">
                    {inviteCode
                      ? '您的邀请码已生成，请保存并使用下方邀请码注册'
                      : '我们会尽快审核您的申请，并通过邮件发送邀请码'}
                  </p>

                  {/* 显示邀请码 */}
                  {inviteCode && (
                    <div className="mb-6 p-4 bg-[#F8F9FC] border-2 border-dashed border-[#2563EB]/30 rounded-xl">
                      <p className="text-xs text-[#94A3B8] mb-2">您的邀请码</p>
                      <div className="flex items-center justify-center gap-2">
                        <code className="font-mono text-2xl font-bold text-[#2563EB] tracking-wider">
                          {inviteCode}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(inviteCode)
                            alert('邀请码已复制到剪贴板')
                          }}
                          className="p-2 hover:bg-[#E2E8F0] rounded-lg transition-colors"
                          title="复制邀请码"
                        >
                          <svg className="w-5 h-5 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={closeInviteModal}
                      className="px-6 py-3 bg-[#2563EB] text-white font-medium rounded-full hover:bg-[#1D4ED8] transition-colors"
                    >
                      知道了
                    </button>
                    {inviteCode && (
                      <button
                        onClick={() => {
                          router.push('/sign-in')
                          closeInviteModal()
                        }}
                        className="px-6 py-3 border border-[#E2E8F0] text-[#0F172A] font-medium rounded-full hover:bg-[#F8F9FC] transition-colors"
                      >
                        去注册
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* 标题 */}
                  <div className="mb-8">
                    <h3 className="font-heading text-2xl font-bold text-[#0F172A] mb-2">
                      申请邀请码
                    </h3>
                    <p className="text-[#475569] text-sm">
                      填写信息，我们会尽快通过邮件发送邀请码
                    </p>
                  </div>

                  {/* 表单 */}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* 姓名 */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-[#0F172A] mb-2">
                        <User size={16} className="text-[#2563EB]" />
                        您的姓名
                      </label>
                      <input
                        type="text"
                        required
                        value={formState.name}
                        onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                        placeholder="请输入您的姓名"
                        className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
                        disabled={submitStatus === 'submitting'}
                      />
                    </div>

                    {/* 邮箱 */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-[#0F172A] mb-2">
                        <Mail size={16} className="text-[#2563EB]" />
                        邮箱地址
                      </label>
                      <input
                        type="email"
                        required
                        value={formState.email}
                        onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
                        disabled={submitStatus === 'submitting'}
                      />
                    </div>

                    {/* 申请理由 */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-[#0F172A] mb-2">
                        <FileText size={16} className="text-[#2563EB]" />
                        申请理由（选填）
                      </label>
                      <textarea
                        value={formState.reason}
                        onChange={(e) => setFormState({ ...formState, reason: e.target.value })}
                        placeholder="简单介绍一下您的英语学习目标..."
                        rows={3}
                        className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all resize-none"
                        disabled={submitStatus === 'submitting'}
                      />
                    </div>

                    {/* 错误信息 */}
                    {errorMessage && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                        {errorMessage}
                      </div>
                    )}

                    {/* 提交按钮 */}
                    <button
                      type="submit"
                      disabled={submitStatus === 'submitting'}
                      className="w-full py-3 bg-[#2563EB] text-white font-semibold rounded-full hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitStatus === 'submitting' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          提交中...
                        </>
                      ) : (
                        '提交申请'
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
