'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  BookOpen,
  FileText,
  Calendar as CalendarIcon,
  User,
  LogOut
} from 'lucide-react'

interface MobileBottomNavProps {
  user?: any
  onLogout?: () => void
  onShowFilters?: () => void
  onShowCheckIn?: () => void
}

export function MobileBottomNav({ user, onLogout, onShowFilters, onShowCheckIn }: MobileBottomNavProps) {
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)

  // 只在主页显示底部导航
  if (pathname !== '/') return null

  return (
    <>
      {/* 底部导航栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-light border-t border-gray-800 px-2 py-2 flex items-center justify-around sm:hidden z-50">
        <Link
          href="/"
          className="flex flex-col items-center gap-1 px-3 py-1 text-accent"
        >
          <Home size={20} />
          <span className="text-xs">首页</span>
        </Link>

        <button
          onClick={onShowFilters}
          className="flex flex-col items-center gap-1 px-3 py-1 text-gray-400"
        >
          <CalendarIcon size={20} />
          <span className="text-xs">筛选</span>
        </button>

        <button
          onClick={onShowCheckIn}
          className="flex flex-col items-center gap-1 px-3 py-1 text-gray-400"
        >
          <CalendarIcon size={20} />
          <span className="text-xs">打卡</span>
        </button>

        <Link
          href="/vocabulary"
          className="flex flex-col items-center gap-1 px-3 py-1 text-gray-400"
        >
          <BookOpen size={20} />
          <span className="text-xs">单词</span>
        </Link>

        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`flex flex-col items-center gap-1 px-3 py-1 ${showMenu ? 'text-accent' : 'text-gray-400'}`}
        >
          <User size={20} />
          <span className="text-xs">我的</span>
        </button>
      </div>

      {/* 用户菜单弹出层 */}
      {showMenu && (
        <div
          className="fixed inset-0 bg-black/50 z-50 sm:hidden"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="absolute bottom-16 left-4 right-4 bg-surface rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                  <User size={20} className="text-accent" />
                </div>
                <div>
                  <p className="text-white font-medium">{user?.username || '未登录'}</p>
                  <p className="text-xs text-gray-400">{user?.role === 'ADMIN' ? '管理员' : '学习者'}</p>
                </div>
              </div>
            </div>

            <div className="p-2">
              <Link
                href="/notes"
                className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-surface-light rounded-lg"
                onClick={() => setShowMenu(false)}
              >
                <FileText size={20} />
                <span>学习笔记</span>
              </Link>

              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-surface-light rounded-lg"
                  onClick={() => setShowMenu(false)}
                >
                  <User size={20} />
                  <span>管理后台</span>
                </Link>
              )}

              {!user && (
                <Link
                  href="/login"
                  className="flex items-center gap-3 px-4 py-3 text-accent hover:bg-surface-light rounded-lg"
                  onClick={() => setShowMenu(false)}
                >
                  <User size={20} />
                  <span>登录</span>
                </Link>
              )}

              {user && (
                <button
                  onClick={() => {
                    onLogout?.()
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-surface-light rounded-lg"
                >
                  <LogOut size={20} />
                  <span>退出登录</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
