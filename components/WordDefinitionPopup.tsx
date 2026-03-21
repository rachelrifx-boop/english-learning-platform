'use client'

import { useState, useRef, useEffect } from 'react'
import { BookOpen, Volume2, X, Loader, Star } from 'lucide-react'

interface WordDefinition {
  word: string
  phonetic?: string
  partOfSpeech?: string
  definition?: string
  translation?: string  // 中文翻译
  example?: string
  synonyms?: string[]
}

interface WordDefinitionPopupProps {
  word: string
  onClose: () => void
  onSave?: (wordData: {
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
  }) => Promise<void>
  isSaved?: boolean
}

export function WordDefinitionPopup({ word, onClose, onSave, isSaved = false }: WordDefinitionPopupProps) {
  const [definition, setDefinition] = useState<WordDefinition | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const wasPlayingRef = useRef(false)

  useEffect(() => {
    fetchDefinition()

    // 获取视频元素并暂停
    const video = document.querySelector('video') as HTMLVideoElement
    if (video) {
      videoRef.current = video
      wasPlayingRef.current = !video.paused
      video.pause()
    }

    // 组件卸载时恢复视频播放
    return () => {
      if (videoRef.current && wasPlayingRef.current) {
        videoRef.current.play().catch(() => {
          // 忽略自动播放错误
        })
      }
    }
  }, [word])

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const fetchDefinition = async () => {
    setLoading(true)
    setError(null)

    try {
      // 先查本地缓存
      const cacheKey = `word_def_${word ? word.toLowerCase() : ''}`
      const cached = localStorage.getItem(cacheKey)

      if (cached) {
        setDefinition(JSON.parse(cached))
        setLoading(false)
        return
      }

      // 调用API获取英文定义
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
      )

      if (!response.ok) {
        throw new Error('未找到单词定义')
      }

      const data = await response.json()

      if (data && Array.isArray(data) && data.length > 0) {
        const entry = data[0]
        const phonetic = entry.phonetics?.find((p: any) => p.text)?.text || entry.phonetic || ''
        const meaning = entry.meanings?.[0]

        const wordDef: WordDefinition = {
          word: entry.word || word,
          phonetic,
          partOfSpeech: meaning?.partOfSpeech || '',
          definition: meaning?.definitions?.[0]?.definition || '',
          example: meaning?.definitions?.[0]?.example || '',
          synonyms: meaning?.definitions?.[0]?.synonyms?.slice(0, 5) || []
        }

        // 获取中文翻译
        try {
          const translateResponse = await fetch(
            `/api/translate-word?word=${encodeURIComponent(word)}`
          )
          if (translateResponse.ok) {
            const translateData = await translateResponse.json()
            if (translateData.success && translateData.data?.translation) {
              wordDef.translation = translateData.data.translation
            }
          }
        } catch (translateError) {
          console.log('翻译失败，忽略:', translateError)
        }

        setDefinition(wordDef)

        // 缓存结果
        localStorage.setItem(cacheKey, JSON.stringify(wordDef))
      }
    } catch (err: any) {
      setError(err.message || '获取定义失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word)
      utterance.lang = 'en-US'
      speechSynthesis.speak(utterance)
    }
  }

  const handleSave = async () => {
    if (definition && onSave) {
      await onSave({
        word,
        definition: definition.definition || '',
        translation: definition.translation || '',
        partOfSpeech: definition.partOfSpeech || '',
        sentence: definition.example
      })
      onClose()
    }
  }

  return (
    <div
      ref={popupRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-surface-light rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto animate-slide-up">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-heading font-bold text-white">
              {word}
            </h3>
            {definition?.phonetic && (
              <span className="text-sm text-gray-400">{definition.phonetic}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader size={24} className="text-accent animate-spin" />
              <span className="ml-2 text-gray-400">加载中...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <BookOpen size={48} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">{error}</p>
              <p className="text-sm text-gray-500 mt-2">请检查单词拼写或稍后重试</p>
            </div>
          ) : definition ? (
            <div className="space-y-4">
              {/* 词性和定义 */}
              {definition.partOfSpeech && (
                <div>
                  <span className="inline-block px-2 py-1 bg-accent/20 text-accent rounded text-sm font-medium">
                    {definition.partOfSpeech}
                  </span>
                </div>
              )}

              {definition.definition && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">释义</h4>
                  <p className="text-white">{definition.definition}</p>
                </div>
              )}

              {definition.translation && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">中文</h4>
                  <p className="text-accent">{definition.translation}</p>
                </div>
              )}

              {definition.example && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">例句</h4>
                  <p className="text-gray-300 italic">"{definition.example}"</p>
                </div>
              )}

              {definition.synonyms && definition.synonyms.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">同义词</h4>
                  <div className="flex flex-wrap gap-2">
                    {definition.synonyms.map((syn, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-surface text-gray-300 rounded text-sm"
                      >
                        {syn}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* 底部操作 */}
        {definition && (
          <div className="p-4 border-t border-gray-700 flex items-center gap-3">
            <button
              onClick={handleSpeak}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-surface text-gray-300 rounded-lg hover:bg-surface-light transition-colors"
            >
              <Volume2 size={18} />
              发音
            </button>

            {onSave && (
              <button
                onClick={handleSave}
                disabled={isSaved}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isSaved
                    ? 'bg-green-500/20 text-green-400 cursor-default'
                    : 'bg-accent text-white hover:opacity-90'
                }`}
              >
                <Star size={18} fill={isSaved ? 'currentColor' : 'none'} />
                {isSaved ? '已收藏' : '收藏'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// 增强的单词高亮组件（带点击查词功能）
interface ClickableWordProps {
  text: string
  onWordClick?: (word: string) => void
  savedWords?: Set<string>
  isActive?: boolean
}

export function ClickableWordHighlight({ text, onWordClick, savedWords, isActive = false }: ClickableWordProps) {
  const [popupWord, setPopupWord] = useState<string | null>(null)

  const handleWordClick = (word: string) => {
    if (onWordClick) {
      onWordClick(word)
    } else {
      setPopupWord(word)
    }
  }

  const handleSave = async (wordData: {
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
  }) => {
    // 可以在这里保存到单词本
    console.log('保存单词:', wordData.word, wordData)
    setPopupWord(null)
  }

  // 分词并渲染
  const renderText = () => {
    const words = text.split(/(\s+|[.,!?;:"'()])/g).filter(w => w.trim().length > 0)

    return words.map((word, index) => {
      const cleanWord = word.replace(/[.,!?;:"'()]/g, '')
      const isWord = /^[a-zA-Z]+$/.test(cleanWord)
      const isSaved = cleanWord ? savedWords?.has(cleanWord.toLowerCase()) : false

      if (!isWord) {
        return <span key={index}>{word}</span>
      }

      return (
        <span
          key={index}
          onClick={() => handleWordClick(cleanWord)}
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
    })
  }

  return (
    <>
      <span className="leading-relaxed">{renderText()}</span>

      {popupWord && (
        <WordDefinitionPopup
          word={popupWord}
          onClose={() => setPopupWord(null)}
          onSave={handleSave}
          isSaved={popupWord ? savedWords?.has(popupWord.toLowerCase()) : false}
        />
      )}
    </>
  )
}
