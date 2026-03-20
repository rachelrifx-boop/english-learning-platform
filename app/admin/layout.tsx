import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-primary">
      {/* 顶部导航 */}
      <header className="bg-surface-light border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/admin" className="text-xl font-heading font-bold text-white">
                管理后台
              </Link>
              <nav className="hidden md:flex gap-6">
                <Link
                  href="/admin"
                  className="text-gray-300 hover:text-accent transition-colors"
                >
                  视频管理
                </Link>
                <Link
                  href="/admin/invite-codes"
                  className="text-gray-300 hover:text-accent transition-colors"
                >
                  邀请码
                </Link>
                <Link
                  href="/admin/feedback"
                  className="text-gray-300 hover:text-accent transition-colors"
                >
                  用户反馈
                </Link>
                <Link
                  href="/admin/notifications"
                  className="text-gray-300 hover:text-accent transition-colors"
                >
                  发送通知
                </Link>
                <Link
                  href="/"
                  className="text-gray-300 hover:text-accent transition-colors"
                >
                  返回首页
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
