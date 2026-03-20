'use client'

import { useState, useEffect } from 'react'
import { Palette, Highlighter } from 'lucide-react'

type HighlightColor = 'none' | 'yellow' | 'green' | 'blue' | 'pink' | 'orange'

interface ColorHighlightProps {
  text: string
  highlights?: Map<string, HighlightColor>
  onToggleHighlight?: (word: string, color: HighlightColor) => void
  showControls?: boolean
}

const colorStyles: Record<HighlightColor, string> = {
  none: '',
  yellow: 'bg-yellow-500/30 text-white',
  green: 'bg-green-500/30 text-white',
  blue: 'bg-blue-500/30 text-white',
  pink: 'bg-pink-500/30 text-white',
  orange: 'bg-orange-500/30 text-white'
}

const colorLabels: Record<HighlightColor, string> = {
  none: '无',
  yellow: '重点',
  green: '掌握',
  blue: '生词',
  pink: '易错',
  orange: '常用'
}

const colorBorders: Record<HighlightColor, string> = {
  none: 'border-gray-700',
  yellow: 'border-yellow-500/50',
  green: 'border-green-500/50',
  blue: 'border-blue-500/50',
  pink: 'border-pink-500/50',
  orange: 'border-orange-500/50'
}

export function ColorHighlight({
  text,
  highlights = new Map(),
  onToggleHighlight,
  showControls = true
}: ColorHighlightProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [showPalette, setShowPalette] = useState(false)

  // 分词并处理高亮
  const renderText = () => {
    // 保留原始标点和空格
    const words = text.split(/(\s+|[.,!?;:"'()])/g).filter(w => w.trim().length > 0)

    return words.map((word, index) => {
      const cleanWord = word.toLowerCase().replace(/[.,!?;:"'()]/g, '')
      const highlightColor = highlights.get(cleanWord) || 'none'
      const isHighlighted = highlightColor !== 'none'

      return (
        <span
          key={index}
          onClick={() => {
            if (onToggleHighlight && cleanWord) {
              setSelectedWord(cleanWord)
              setShowPalette(!showPalette)
            }
          }}
          className={`
            cursor-pointer transition-all duration-200
            ${isHighlighted ? `${colorStyles[highlightColor]} px-1 rounded border ${colorBorders[highlightColor]}` : 'hover:bg-accent/10 px-1 rounded'}
          `}
          title={isHighlighted ? colorLabels[highlightColor] : '点击标记重点'}
        >
          {word}
        </span>
      )
    })
  }

  const handleColorSelect = (color: HighlightColor) => {
    if (selectedWord && onToggleHighlight) {
      onToggleHighlight(selectedWord, color)
    }
    setShowPalette(false)
    setSelectedWord(null)
  }

  return (
    <div className="relative">
      {/* 文本显示 */}
      <div className="text-base leading-relaxed">
        {renderText()}
      </div>

      {/* 标记控制面板 */}
      {showControls && showPalette && selectedWord && (
        <div className="absolute z-50 mt-2 bg-surface-light border border-gray-700 rounded-lg shadow-xl p-3 animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <Highlighter size={14} className="text-accent" />
            <span className="text-sm text-white">标记 "{selectedWord}"</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              ['none', 'yellow', 'green', 'blue', 'pink', 'orange'] as HighlightColor[]
            ).map((color) => (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${color === 'none'
                    ? 'bg-surface text-gray-400 hover:bg-surface-light'
                    : `${colorStyles[color]} hover:opacity-80`
                  }
                `}
              >
                {colorLabels[color]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 图例 */}
      {showControls && highlights.size > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="text-gray-400">标记图例：</span>
          {(
            ['yellow', 'green', 'blue', 'pink', 'orange'] as HighlightColor[]
          ).filter(c => Array.from(highlights.values()).includes(c)).map((color) => (
            <span
              key={color}
              className={`px-2 py-1 rounded ${colorStyles[color]} border ${colorBorders[color]}`}
            >
              {colorLabels[color]}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// 统计高亮信息
export function getHighlightStats(highlights: Map<string, HighlightColor>) {
  const stats: Record<HighlightColor, number> = {
    none: 0,
    yellow: 0,
    green: 0,
    blue: 0,
    pink: 0,
    orange: 0
  }

  highlights.forEach(color => {
    stats[color]++
  })

  return stats
}
