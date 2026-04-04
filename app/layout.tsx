import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

const heading = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Onsay Lab - 英语学习平台',
  description: 'Onsay Lab英语学习平台，精选真实场景视频，支持双语字幕、单词学习和跟读练习',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <head>
        {/* 优化：预连接到视频存储域名，加速视频加载 */}
        <link rel="preconnect" href="https://cknvuclkzgylbmksfkfs.r2.cloudflarestorage.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cknvuclkzgylbmksfkfs.r2.cloudflarestorage.com" />
      </head>
      <body className={`${heading.variable} font-heading antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
