'use client'

import { useState, useRef, useEffect } from 'react'
import { PATTERN_RULES } from './SentencePatternHighlight'
import { findPhrasesInText, getPhraseInfo } from '@/lib/phrasal-verbs'
import { PhrasePopup } from './PhrasePopup'

export interface HighlightInfo {
  start: number
  end: number
  text: string
  color: string
  type: 'phrase' | 'pattern'
  translation?: string
  description?: string
}

interface EnhancedSubtitleHighlightProps {
  text: string
  savedWords?: Set<string>
  isActive?: boolean
  onWordClick?: (word: string) => void
  onHighlightInfoChange?: (highlights: HighlightInfo[]) => void
}

interface PhraseMatch {
  phrase: string
  start: number
  end: number
  info: {
    translation: string
    examples: Array<{
      en: string
      zh: string
    }>
  }
}

export function EnhancedSubtitleHighlight({
  text,
  savedWords,
  isActive = false,
  onWordClick,
  onHighlightInfoChange
}: EnhancedSubtitleHighlightProps) {
  const [popupWord, setPopupWord] = useState<string | null>(null)
  const [phrasePopup, setPhrasePopup] = useState<{ phrase: string; info: PhraseMatch['info']; position: { x: number; y: number } } | null>(null)
  const containerRef = useRef<HTMLSpanElement>(null)

  // 当高亮信息变化时，通知父组件（动词短语 + 句型高亮）
  useEffect(() => {
    if (onHighlightInfoChange) {
      const highlights: HighlightInfo[] = []

      // 收集动词短语高亮信息
      const phraseMatches = findPhrasesInText(text)
      phraseMatches.forEach(phraseMatch => {
        highlights.push({
          start: phraseMatch.start,
          end: phraseMatch.end,
          text: phraseMatch.phrase,
          color: 'bg-yellow-500/30 text-white border border-yellow-500/50',
          type: 'phrase',
          translation: phraseMatch.info?.translation || ''
        })
      })

      // 收集从句和复杂结构句型高亮（蓝色）
      const clauseRules = PATTERN_RULES.filter(rule =>
        rule.color.includes('blue') || rule.color.includes('border-b-2 border-blue-500')
      )
      clauseRules.forEach(rule => {
        const regex = new RegExp(rule.pattern.source, rule.pattern.flags)
        let match
        while ((match = regex.exec(text)) !== null) {
          highlights.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
            color: rule.color,
            type: 'pattern',
            description: rule.description
          })
        }
      })

      // 收集高级表达高亮（紫色、粉色）
      const advancedRules = PATTERN_RULES.filter(rule =>
        rule.color.includes('purple') || rule.color.includes('pink')
      )
      advancedRules.forEach(rule => {
        const regex = new RegExp(rule.pattern.source, rule.pattern.flags)
        let match
        while ((match = regex.exec(text)) !== null) {
          highlights.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
            color: rule.color,
            type: 'pattern',
            description: rule.description
          })
        }
      })

      // 收集被动语态高亮（绿色）
      const passiveRules = PATTERN_RULES.filter(rule =>
        rule.color.includes('green')
      )
      passiveRules.forEach(rule => {
        const regex = new RegExp(rule.pattern.source, rule.pattern.flags)
        let match
        while ((match = regex.exec(text)) !== null) {
          highlights.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
            color: rule.color,
            type: 'pattern',
            description: rule.description
          })
        }
      })

      // 按起始位置排序并合并重叠的高亮
      highlights.sort((a, b) => a.start - b.start)
      const mergedHighlights: HighlightInfo[] = []

      highlights.forEach(highlight => {
        if (mergedHighlights.length === 0) {
          mergedHighlights.push(highlight)
        } else {
          const last = mergedHighlights[mergedHighlights.length - 1]
          if (highlight.start <= last.end) {
            // 重叠，保留动词短语优先，其次是句型
            if (highlight.type === 'phrase' && last.type === 'pattern') {
              mergedHighlights[mergedHighlights.length - 1] = highlight
            }
          } else {
            mergedHighlights.push(highlight)
          }
        }
      })

      onHighlightInfoChange(mergedHighlights)
    }
  }, [text, onHighlightInfoChange])

  const handleWordClick = (word: string) => {
    if (onWordClick) {
      onWordClick(word)
    } else {
      setPopupWord(word)
    }
  }

  // 处理短语悬停
  const handlePhraseMouseEnter = (e: React.MouseEvent, phraseData: PhraseMatch) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setPhrasePopup({
      phrase: phraseData.phrase,
      info: phraseData.info,
      position: {
        x: rect.left + rect.width / 2 - 200, // 居中显示
        y: rect.bottom + 8
      }
    })
  }

  // 处理短语点击
  const handlePhraseClick = (e: React.MouseEvent, phraseData: PhraseMatch) => {
    e.stopPropagation()
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setPhrasePopup({
      phrase: phraseData.phrase,
      info: phraseData.info,
      position: {
        x: rect.left + rect.width / 2 - 200,
        y: rect.bottom + 8
      }
    })
  }

  // 渲染文本，处理动词短语高亮、句型高亮和单词点击
  const renderText = () => {
    const tokens: React.ReactNode[] = []
    let lastIndex = 0

    // 找到所有动词短语
    const phraseMatches = findPhrasesInText(text)

    // 找到所有需要高亮的句型（从句、高级表达、被动语态）
    const patternMatches: Array<{ start: number; end: number; rule: typeof PATTERN_RULES[0]; match: string }> = []

    // 蓝色：从句和复杂结构
    const clauseRules = PATTERN_RULES.filter(rule =>
      rule.color.includes('blue') || rule.color.includes('border-b-2 border-blue-500')
    )
    // 紫色/粉色：高级表达
    const advancedRules = PATTERN_RULES.filter(rule =>
      rule.color.includes('purple') || rule.color.includes('pink')
    )
    // 绿色：被动语态
    const passiveRules = PATTERN_RULES.filter(rule =>
      rule.color.includes('green')
    )

    const allRules = [...clauseRules, ...advancedRules, ...passiveRules]
    allRules.forEach(rule => {
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags)
      let match
      while ((match = regex.exec(text)) !== null) {
        patternMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          rule,
          match: match[0]
        })
      }
    })

    // 合并所有匹配并按起始位置排序
    const allMatches: Array<{ type: 'pattern' | 'phrase'; start: number; end: number; data: any }> = [
      ...patternMatches.map(m => ({ type: 'pattern' as const, start: m.start, end: m.end, data: m })),
      ...phraseMatches.map(m => ({ type: 'phrase' as const, start: m.start, end: m.end, data: m }))
    ].sort((a, b) => a.start - b.start)

    // 合并重叠的匹配（动词短语优先）
    const mergedMatches: typeof allMatches = []
    allMatches.forEach(match => {
      if (mergedMatches.length === 0) {
        mergedMatches.push(match)
      } else {
        const last = mergedMatches[mergedMatches.length - 1]
        if (match.start <= last.end) {
          // 重叠，动词短语优先
          if (match.type === 'phrase' && last.type === 'pattern') {
            mergedMatches[mergedMatches.length - 1] = match
          } else if (match.end > last.end) {
            last.end = match.end
          }
        } else {
          mergedMatches.push(match)
        }
      }
    })

    // 构建结果
    mergedMatches.forEach((match, index) => {
      // 添加普通文本（带单词点击）
      if (match.start > lastIndex) {
        const normalText = text.slice(lastIndex, match.start)
        tokens.push(...renderClickableWords(normalText, `normal-${match.start}`))
      }

      const matchText = text.slice(match.start, match.end)

      if (match.type === 'pattern') {
        // 句型高亮
        const patternWords = renderClickableWords(matchText, `pattern-${match.start}`)
        tokens.push(
          <span
            key={`pattern-${match.start}-${index}`}
            className={`${match.data.rule.color} px-1 rounded transition-colors cursor-help`}
            title={match.data.rule.description}
          >
            {patternWords}
          </span>
        )
      } else if (match.type === 'phrase') {
        // 短语高亮 - 黄色背景，白色字体
        tokens.push(
          <span
            key={`phrase-${match.start}-${index}`}
            className="bg-yellow-500/30 text-white px-1.5 py-0.5 rounded font-medium cursor-pointer hover:bg-yellow-500/50 transition-all border border-yellow-500/50"
            onMouseEnter={(e) => handlePhraseMouseEnter(e, match.data)}
            onClick={(e) => handlePhraseClick(e, match.data)}
          >
            {matchText}
          </span>
        )
      }

      lastIndex = match.end
    })

    // 添加剩余文本
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex)
      tokens.push(...renderClickableWords(remainingText, `remaining-${lastIndex}`))
    }

    return tokens.length > 0 ? tokens : [text]
  }

  // 渲染可点击的单词
  const renderClickableWords = (content: string, prefix: string = ''): React.ReactNode[] => {
    // 处理包含HTML标签的情况
    // 先移除简单的HTML标签（如<u>, </u>, <b>, </b>等），保留单词
    const contentWithoutTags = content.replace(/<\/?[a-z]+>/gi, '')

    const words = contentWithoutTags.split(/(\s+|[.,!?;:"'()])/g).filter(w => w.trim().length > 0)
    const result: React.ReactNode[] = []

    words.forEach((word, index) => {
      const cleanWord = word.replace(/[.,!?;:"'()]/g, '')
      const isWord = /^[a-zA-Z]+$/.test(cleanWord)
      const isSaved = savedWords?.has(cleanWord.toLowerCase())

      if (!isWord) {
        result.push(<span key={`${prefix}-${index}-${word}`}>{word}</span>)
      } else {
        result.push(
          <span
            key={`${prefix}-${index}-${cleanWord}`}
            onClick={(e) => {
              e.stopPropagation()
              handleWordClick(cleanWord)
            }}
            className={`
              cursor-pointer inline-block transition-all
              ${isSaved
                ? 'text-accent font-semibold bg-accent/10 px-1 rounded'
                : isActive
                  ? 'text-white hover:bg-accent/10 hover:text-accent px-1 rounded font-medium'
                  : 'text-gray-200 hover:bg-accent/10 hover:text-accent px-1 rounded'
              }
            `}
            title={isSaved ? '已收藏' : '点击查看释义'}
          >
            {word}
          </span>
        )
      }
    })

    return result
  }

  return (
    <>
      <span className="leading-relaxed" ref={containerRef}>{renderText()}</span>

      {/* 短语信息弹窗 */}
      {phrasePopup && (
        <PhrasePopup
          phrase={phrasePopup.phrase}
          info={phrasePopup.info}
          position={phrasePopup.position}
          onClose={() => setPhrasePopup(null)}
        />
      )}
    </>
  )
}
