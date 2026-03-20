'use client'

import { Search, Heart, User as UserIcon, Sun, Moon } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/components/ThemeProvider'

interface SettingsDropdownProps {
  onSearchClick?: () => void
}

export function SettingsDropdown({ onSearchClick }: SettingsDropdownProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex items-center gap-2">
      {/* 搜索按钮 */}
      <button
        onClick={onSearchClick}
        className="p-2 text-gray-300 hover:text-accent transition-colors rounded-lg hover:bg-surface"
        title="搜索视频"
      >
        <Search size={20} />
      </button>

      {/* 收藏按钮 */}
      <Link
        href="/favorites"
        className="p-2 text-gray-300 hover:text-accent transition-colors rounded-lg hover:bg-surface"
        title="我的收藏"
      >
        <Heart size={20} />
      </Link>

      {/* 账号设置按钮 */}
      <Link
        href="/settings"
        className="p-2 text-gray-300 hover:text-accent transition-colors rounded-lg hover:bg-surface"
        title="账号设置"
      >
        <UserIcon size={20} />
      </Link>

      {/* 主题切换按钮 */}
      <button
        onClick={toggleTheme}
        className="p-2 text-gray-300 hover:text-accent transition-colors rounded-lg hover:bg-surface"
        title={theme === 'dark' ? '切换到白色主题' : '切换到深色主题'}
      >
        {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
      </button>
    </div>
  )
}
