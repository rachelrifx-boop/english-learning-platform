'use client'

import React from 'react'

// 句型规则定义
interface PatternRule {
  name: string
  pattern: RegExp
  color: string
  description: string
}

// 生活Vlog视频重点学习词汇和短语表达
// 基于日常生活场景，强调高频实用表达
const PATTERN_RULES: PatternRule[] = [
  // ==================== 黄色高亮：重点短语表达 ====================
  {
    name: '日常动词短语',
    pattern: /\b(?:wake\s+up|get\s+up|head\s+(?:out|back|home)|hang\s+out|catch\s+up|figure\s+out|check\s+(?:out|in)|pick\s+(?:up|out)|drop\s+off|look\s+(?:forward|after|around)|run\s+(?:into|out|errands)|get\s+ready|clean\s+up|set\s+up|break\s+down|show\s+around|end\s+up|start\s+(?:with|off)|work\s+(?:on|out)|turn\s+(?:into|on|off)|go\s+(?:back|ahead|out)|come\s+(?:over|back|along)|take\s+(?:care|out|off)|keep\s+(?:up|on)|make\s+(?:sure|up|sense)|give\s+(?:up|out|away))\b/gi,
    color: 'bg-yellow-500/40 border-b-2 border-yellow-500',
    description: '高频动词短语'
  },
  {
    name: '时间表达',
    pattern: /\b(?:the\s+other\s+day|earlier\s+today|later\s+on|right\s+now|at\s+the\s+moment|these\s+days|in\s+the\s+(?:morning|afternoon|evening)|last\s+(?:week|night|weekend)|next\s+(?:week|month|day)|a\s+couple\s+of\s+(?:days|weeks)|so\s+far|by\s+the\s+time|all\s+day\s+long|at\s+first|at\s+last|in\s+the\s+end)\b/gi,
    color: 'bg-yellow-500/40 border-b-2 border-yellow-500',
    description: '时间表达'
  },
  {
    name: '程度副词',
    pattern: /\b(?:actually|basically|honestly|literally|seriously|totally|completely|absolutely|really|extremely|incredibly|super|pretty|quite|rather|kind\s+of|sort\s+of)a?\b/gi,
    color: 'bg-yellow-500/40 border-b-2 border-yellow-500',
    description: '程度副词'
  },
  {
    name: '连接过渡词',
    pattern: /\b(?:anyway|besides|meanwhile|otherwise|therefore|thus|however|although|though|anyways|plus|also|as\s+well|too|either|neither)\b/gi,
    color: 'bg-yellow-500/40 border-b-2 border-yellow-500',
    description: '连接词'
  },
  {
    name: '常用口语表达',
    pattern: /\b(?:you\s+know|i\s+mean|i\s+guess|i\s+think|sort\s+of|kind\s+of|a\s+little\s+bit|at\s+all|of\s+course|for\s+sure|no\s+matter|in\s+general|basically|actually|honestly)\b/gi,
    color: 'bg-yellow-500/40 border-b-2 border-yellow-500',
    description: '口语表达'
  },
  {
    name: '情感态度词',
    pattern: /\b(?:excited|nervous|anxious|worried|stressed|relaxed|comfortable|happy|sad|upset|confused|surprised|amazed|shocked|disappointed|proud|grateful|thankful|glad|sorry)\b/gi,
    color: 'bg-yellow-500/40 border-b-2 border-yellow-500',
    description: '情感词汇'
  },
  {
    name: '日常生活词汇',
    pattern: /\b(?:routine|schedule|deadline|project|assignment|meeting|appointment|errand|chore|grocery|laundry|dishes|mess|clutter|space|room|apartment|house|place|area|location|spot)\b/gi,
    color: 'bg-yellow-500/40 border-b-2 border-yellow-500',
    description: '生活词汇'
  },
  {
    name: '工作学习动词',
    pattern: /\b(?:organize|plan|prepare|arrange|manage|handle|deal\s+with|work\s+on|focus\s+on|concentrate|study|practice|learn|improve|develop|create|design|build|finish|complete|start|begin)\b/gi,
    color: 'bg-yellow-500/40 border-b-2 border-yellow-500',
    description: '行动动词'
  },
  {
    name: '社交活动',
    pattern: /\b(?:meet\s+up|hang\s+out|get\s+together|spend\s+time|catch\s+up|talk\s+(?:about|with|to)|visit|invite|welcome|introduce|celebrate|enjoy|relax|have\s+fun)\b/gi,
    color: 'bg-yellow-500/40 border-b-2 border-yellow-500',
    description: '社交表达'
  },
  {
    name: '建议和计划',
    pattern: /\b(?:should\s+(?:have|be)|could\s+(?:have|be)|would\s+(?:like|love|want)|need\s+to|have\s+to|got\s+to|supposed\s+to|planned\s+to|going\s+to|thinking\s+about|looking\s+forward\s+to)\b/gi,
    color: 'bg-yellow-500/40 border-b-2 border-yellow-500',
    description: '情态表达'
  },
  // ==================== 蓝色高亮：从句和复杂结构 ====================
  {
    name: '定语从句',
    pattern: /(?:,\s*)?(?:which|that|who|whom|whose|where|when|why)\s+\w+(?:\s+\w+){0,8}/gi,
    color: 'bg-blue-500/30 border-b-2 border-blue-500',
    description: '定语从句'
  },
  {
    name: '状语从句',
    pattern: /\b(?:when|while|if|unless|because|although|though|even\s+though|before|after|since|as|once)\b[^,.!?]*[,.!?]/gi,
    color: 'bg-blue-500/30 border-b-2 border-blue-500',
    description: '状语从句'
  },
  // ==================== 紫色高亮：高级表达 ====================
  {
    name: '倒装句',
    pattern: /\b(?:never|seldom|hardly|rarely|scarcely|not\s+only|not\s+until|little|neither|nor)\b[^,.!?]*[,.!?]/gi,
    color: 'bg-purple-500/30 border-b-2 border-purple-500',
    description: '倒装句'
  },
  {
    name: '虚拟语气',
    pattern: /\b(?:would\s+(?:have|be|could|should)|if\s+(?:i|you|he|she|it|we|they)\s+(?:were|had|could)|wish\s+(?:i|you|he|she)\s+(?:were|could))[^,.!?]*[,.!?]/gi,
    color: 'bg-pink-500/30 border-b-2 border-pink-500',
    description: '虚拟语气'
  },
  {
    name: '被动语态',
    pattern: /\b(?:am|is|are|was|were|be|been|being)\s+\w+ed\b/gi,
    color: 'bg-green-500/30 border-b-2 border-green-500',
    description: '被动语态'
  }
]

interface SentencePatternHighlightProps {
  text: string
  isActive?: boolean
}

export function SentencePatternHighlight({ text, isActive = false }: SentencePatternHighlightProps) {
  const highlightPatterns = (content: string): React.ReactNode[] => {
    const tokens: React.ReactNode[] = []
    let lastIndex = 0
    const matches: Array<{ start: number; end: number; rule: PatternRule; match: string }> = []

    // 找到所有匹配的句型
    PATTERN_RULES.forEach(rule => {
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags)
      let match
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          rule,
          match: match[0]
        })
      }
    })

    // 按起始位置排序
    matches.sort((a, b) => a.start - b.start)

    // 合并重叠的匹配
    const mergedMatches: typeof matches = []
    matches.forEach(match => {
      if (mergedMatches.length === 0) {
        mergedMatches.push(match)
      } else {
        const last = mergedMatches[mergedMatches.length - 1]
        if (match.start <= last.end) {
          // 重叠，保留更长的匹配
          if (match.end > last.end) {
            last.end = match.end
          }
        } else {
          mergedMatches.push(match)
        }
      }
    })

    // 构建结果
    mergedMatches.forEach(match => {
      // 添加普通文本
      if (match.start > lastIndex) {
        tokens.push(
          <span key={`text-${lastIndex}`} className={isActive ? 'text-white' : 'text-gray-200'}>
            {content.slice(lastIndex, match.start)}
          </span>
        )
      }

      // 添加高亮的句型
      const patternText = content.slice(match.start, match.end)
      tokens.push(
        <span
          key={`pattern-${match.start}`}
          className={`${match.rule.color} px-1 rounded transition-colors cursor-help`}
          title={match.rule.description}
        >
          {patternText}
        </span>
      )

      lastIndex = match.end
    })

    // 添加剩余文本
    if (lastIndex < content.length) {
      tokens.push(
        <span key={`text-${lastIndex}`} className={isActive ? 'text-white' : 'text-gray-200'}>
          {content.slice(lastIndex)}
        </span>
      )
    }

    return tokens.length > 0 ? tokens : [content]
  }

  return (
    <span className="leading-relaxed">
      {highlightPatterns(text)}
    </span>
  )
}

// 导出句型规则供其他组件使用
export { PATTERN_RULES }
