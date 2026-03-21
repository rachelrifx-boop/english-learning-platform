'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { parseWordsFromSentence } from '@/lib/dictionary-api'
import { WordCard, DictionaryEntry } from './WordCard'

interface SubtitleWordHighlightProps {
  text: string
  onWordSave?: (wordData: {
    word: string
    definition: string
    translation: string
    partOfSpeech: string
    sentence?: string
    sentenceTranslation?: string
    usPhonetic?: string
    ukPhonetic?: string
    collocations?: string[]
    synonyms?: string[]
    antonyms?: string[]
  }) => void
  savedWords?: Set<string>
}

export function SubtitleWordHighlight({ text, onWordSave, savedWords = new Set() }: SubtitleWordHighlightProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [wordEntry, setWordEntry] = useState<DictionaryEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCard, setShowCard] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const wasPlayingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const words = parseWordsFromSentence(text)

  // 处理视频暂停和恢复
  useEffect(() => {
    if (showCard) {
      const video = document.querySelector('video') as HTMLVideoElement
      if (video) {
        videoRef.current = video
        wasPlayingRef.current = !video.paused
        video.pause()
      }
    } else {
      if (videoRef.current && wasPlayingRef.current) {
        videoRef.current.play().catch(() => {
          // 忽略自动播放错误
        })
      }
    }
  }, [showCard])

  const handleWordClick = useCallback(async (word: string) => {
    // 如果点击的是同一个单词，不做任何事
    if (selectedWord === word && showCard) {
      return
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setSelectedWord(word)
    setLoading(true)
    setError(null)
    setShowCard(true)

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`/api/words/lookup?word=${encodeURIComponent(word)}`, {
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error('查词失败')
      }

      const data = await response.json()

      if (data.success) {
        setWordEntry(data.data.entry)
      } else {
        setWordEntry(null)
        setError(data.error || '未找到该单词')
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // 请求被取消，忽略错误
        return
      }
      console.error('查词失败:', word, err)
      setWordEntry(null)
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }, [selectedWord, showCard])

  const handleClose = useCallback(() => {
    // 取消正在进行的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setShowCard(false)
    setSelectedWord(null)
    setWordEntry(null)
    setError(null)
  }, [])

  const handleSave = useCallback((translation: string) => {
    if (wordEntry && selectedWord) {
      const firstMeaning = wordEntry.meanings[0]
      const firstDefinition = firstMeaning?.definitions[0]?.definition || ''
      const firstExample = firstMeaning?.definitions[0]?.example || ''

      // 收集所有近义词和反义词
      const allSynonyms = wordEntry.meanings.flatMap(m => m.synonyms || [])
      const allAntonyms = wordEntry.meanings.flatMap(m => m.antonyms || [])

      onWordSave?.({
        word: selectedWord,
        definition: firstDefinition,
        translation,
        partOfSpeech: firstMeaning?.partOfSpeech || '',
        sentence: firstExample,
        usPhonetic: wordEntry.usPhonetic,
        ukPhonetic: wordEntry.ukPhonetic,
        collocations: wordEntry.collocations,
        synonyms: allSynonyms.length > 0 ? allSynonyms : undefined,
        antonyms: allAntonyms.length > 0 ? allAntonyms : undefined
      })
    }
  }, [wordEntry, selectedWord, onWordSave])

  const isSaved = selectedWord ? savedWords.has(selectedWord.toLowerCase()) : false

  // 点击外部关闭卡片
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        handleClose()
      }
    }

    if (showCard) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCard, handleClose])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  if (words.length === 0) {
    return <span>{text}</span>
  }

  return (
    <div className="relative">
      <span>
        {words.map((item, index) => {
          const beforeText = text.slice(index === 0 ? 0 : words[index - 1]?.end || 0, item.start)
          const word = item.word
          const afterText = text.slice(item.end, words[index + 1]?.start || text.length)

          return (
            <span key={index}>
              {beforeText}
              <button
                onClick={() => handleWordClick(word)}
                className="mx-0.5 px-1 rounded transition-colors hover:bg-accent/20 text-inherit border-b border-dashed border-gray-600 hover:border-accent"
              >
                {word}
              </button>
              {index === words.length - 1 && afterText}
            </span>
          )
        })}
      </span>

      {/* 单词卡片 */}
      {showCard && selectedWord && (
        <div ref={cardRef} className="absolute z-50 mt-2 w-96">
          <WordCard
            word={selectedWord}
            entry={wordEntry}
            loading={loading}
            error={error}
            isSaved={isSaved}
            onSave={handleSave}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  )
}
