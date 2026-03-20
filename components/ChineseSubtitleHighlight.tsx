'use client'

import React from 'react'
import { HighlightInfo } from './EnhancedSubtitleHighlight'

interface ChineseSubtitleHighlightProps {
  chineseText: string
  englishText: string
  englishHighlights: HighlightInfo[]
  isActive?: boolean
}

export function ChineseSubtitleHighlight({
  chineseText,
  englishText,
  englishHighlights,
  isActive = false
}: ChineseSubtitleHighlightProps) {
  // 渲染带高亮的中文文本（只高亮动词短语，不高亮句型）
  const renderHighlightedText = () => {
    if (!englishHighlights || englishHighlights.length === 0) {
      return <span>{chineseText}</span>
    }

    // 创建中文高亮区间（只处理动词短语）
    const zhHighlights: Array<{ start: number; end: number; color: string }> = []

    englishHighlights.forEach(enHighlight => {
      // 只处理动词短语，忽略句型高亮
      if (enHighlight.type === 'phrase' && enHighlight.translation) {
        const translation = enHighlight.translation

        if (chineseText.includes(translation)) {
          // 找到翻译在中文文本中的位置
          const index = chineseText.indexOf(translation)
          zhHighlights.push({
            start: index,
            end: index + translation.length,
            color: enHighlight.color
          })
        } else {
          // 如果没有找到精确翻译，尝试查找部分翻译
          // 将翻译拆分成多个可能的翻译
          const possibleTranslations = translation.split(/[、，]/).filter(t => t.trim().length > 0)

          for (const trans of possibleTranslations) {
            if (chineseText.includes(trans.trim())) {
              const index = chineseText.indexOf(trans.trim())
              zhHighlights.push({
                start: index,
                end: index + trans.trim().length,
                color: enHighlight.color
              })
              break // 找到一个就停止
            }
          }
        }
      }
      // 句型高亮（type === 'pattern'）被忽略，不在中文中显示
    })

    // 如果没有找到任何高亮，返回普通文本
    if (zhHighlights.length === 0) {
      return <span>{chineseText}</span>
    }

    // 合并重叠或相邻的高亮区间
    zhHighlights.sort((a, b) => a.start - b.start)
    const mergedHighlights: typeof zhHighlights = []

    zhHighlights.forEach(highlight => {
      if (mergedHighlights.length === 0) {
        mergedHighlights.push(highlight)
      } else {
        const last = mergedHighlights[mergedHighlights.length - 1]
        // 如果重叠或相邻（距离小于2个字符），合并它们
        if (highlight.start <= last.end + 2) {
          last.end = Math.max(last.end, highlight.end)
        } else {
          mergedHighlights.push(highlight)
        }
      }
    })

    // 渲染带高亮的文本
    const result: React.ReactNode[] = []
    let lastIndex = 0

    mergedHighlights.forEach((highlight, index) => {
      // 添加高亮前的普通文本
      if (highlight.start > lastIndex) {
        result.push(
          <span key={`text-${lastIndex}`} className={isActive ? '!text-gray-300' : ''}>
            {chineseText.slice(lastIndex, highlight.start)}
          </span>
        )
      }

      // 添加高亮文本
      const highlightedText = chineseText.slice(highlight.start, highlight.end)
      result.push(
        <span
          key={`highlight-${index}`}
          className={`${highlight.color} px-1.5 py-0.5 rounded font-medium transition-all`}
          title="对应动词短语翻译"
        >
          {highlightedText}
        </span>
      )

      lastIndex = highlight.end
    })

    // 添加剩余文本
    if (lastIndex < chineseText.length) {
      result.push(
        <span key={`text-${lastIndex}`} className={isActive ? '!text-gray-300' : ''}>
          {chineseText.slice(lastIndex)}
        </span>
      )
    }

    return result.length > 0 ? result : <span>{chineseText}</span>
  }

  return (
    <span className="leading-relaxed">
      {renderHighlightedText()}
    </span>
  )
}
