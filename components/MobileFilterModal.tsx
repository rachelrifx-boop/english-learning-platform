'use client'

import { X, Filter } from 'lucide-react'

interface MobileFilterModalProps {
  isOpen: boolean
  onClose: () => void
  difficulties: string[]
  durations: Array<{ label: string; value: string }>
  categories: string[]
  categoryTranslations: Record<string, string>
  selectedDifficulty: string | null
  selectedDuration: string | null
  selectedCategory: string | null
  onDifficultyChange: (difficulty: string | null) => void
  onDurationChange: (duration: string | null) => void
  onCategoryChange: (category: string | null) => void
  onClearAll: () => void
}

export function MobileFilterModal({
  isOpen,
  onClose,
  difficulties,
  durations,
  categories,
  categoryTranslations,
  selectedDifficulty,
  selectedDuration,
  selectedCategory,
  onDifficultyChange,
  onDurationChange,
  onCategoryChange,
  onClearAll
}: MobileFilterModalProps) {
  if (!isOpen) return null

  const hasActiveFilters = selectedDifficulty || selectedDuration || selectedCategory

  return (
    <div className="fixed inset-0 bg-black/50 z-50 sm:hidden">
      <div className="absolute bottom-0 left-0 right-0 bg-surface-light rounded-t-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-accent" />
            <h3 className="text-lg font-semibold text-white">筛选视频</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 难度筛选 */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">难度级别</h4>
            <div className="flex flex-wrap gap-2">
              {difficulties.map((diff) => (
                <button
                  key={diff}
                  onClick={() => onDifficultyChange(diff)}
                  className={`px-4 py-2 text-sm rounded-full transition-colors ${
                    selectedDifficulty === diff
                      ? 'bg-accent text-white'
                      : 'bg-surface text-gray-400'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* 时长筛选 */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">视频时长</h4>
            <div className="space-y-2">
              {durations.map((dur) => (
                <button
                  key={dur.value}
                  onClick={() => onDurationChange(dur.value)}
                  className={`w-full text-left px-4 py-3 text-sm rounded-lg transition-colors ${
                    selectedDuration === dur.value
                      ? 'bg-accent/20 text-accent'
                      : 'bg-surface text-gray-400'
                  }`}
                >
                  {dur.label}
                </button>
              ))}
            </div>
          </div>

          {/* 话题筛选 */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">视频话题</h4>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onCategoryChange(cat)}
                  className={`px-4 py-2 text-sm rounded-full transition-colors ${
                    selectedCategory === cat
                      ? 'bg-accent-2 text-white'
                      : 'bg-surface text-gray-400'
                  }`}
                >
                  {categoryTranslations[cat] || cat}
                </button>
              ))}
            </div>
          </div>

          {/* 当前筛选状态 */}
          {hasActiveFilters && (
            <div className="bg-surface rounded-xl p-4">
              <h4 className="text-sm font-medium text-white mb-3">当前筛选</h4>
              <div className="flex flex-wrap gap-2">
                {selectedDifficulty && (
                  <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm">
                    难度: {selectedDifficulty}
                  </span>
                )}
                {selectedDuration && (
                  <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm">
                    时长: {durations.find(d => d.value === selectedDuration)?.label}
                  </span>
                )}
                {selectedCategory && (
                  <span className="px-3 py-1 bg-accent-2/20 text-accent-2 rounded-full text-sm">
                    话题: {categoryTranslations[selectedCategory] || selectedCategory}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="w-full px-4 py-3 text-sm text-gray-400 border border-gray-700 rounded-lg"
            >
              清除所有筛选
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-accent text-white rounded-lg font-medium"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
