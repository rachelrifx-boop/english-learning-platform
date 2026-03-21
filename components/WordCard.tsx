'use client'

import { useState, useEffect, useRef } from 'react'
import { Volume2, Star, X, Languages, Link2, Headphones } from 'lucide-react'
import { speakWord, getPartOfSpeechColor } from '@/lib/dictionary-api'

export interface DictionaryEntry {
  word: string
  phonetic?: string
  usPhonetic?: string   // 美音音标
  ukPhonetic?: string   // 英音音标
  audio?: string
  meanings: Array<{
    partOfSpeech: string
    definitions: Array<{
      definition: string
      example?: string
      exampleTranslation?: string  // 例句中文翻译
      synonyms?: string[]  // 该定义的近义词
      antonyms?: string[]  // 该定义的反义词
    }>
    synonyms?: string[]   // 该词性的近义词
    antonyms?: string[]   // 该词性的反义词
  }>
  collocations?: string[]  // 常用搭配词
}

interface WordCardProps {
  word: string
  entry: DictionaryEntry | null
  loading?: boolean
  error?: string | null
  onSave?: (translation: string, exampleTranslations?: Record<string, string>) => void
  isSaved?: boolean
  onClose?: () => void
}

export function WordCard({ word, entry, loading, error, onSave, isSaved, onClose }: WordCardProps) {
  const [playingUS, setPlayingUS] = useState(false)
  const [playingUK, setPlayingUK] = useState(false)
  const [chineseTranslation, setChineseTranslation] = useState<string>('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const wasPlayingRef = useRef(false)

  // 组件挂载时暂停视频，卸载时恢复
  useEffect(() => {
    const video = document.querySelector('video') as HTMLVideoElement
    if (video) {
      videoRef.current = video
      wasPlayingRef.current = !video.paused
      video.pause()
    }

    return () => {
      if (videoRef.current && wasPlayingRef.current) {
        videoRef.current.play().catch(() => {
          // 忽略自动播放错误
        })
      }
    }
  }, [])

  // 获取中文翻译 - 改进版，添加词性上下文提高准确性
  useEffect(() => {
    if (entry && word) {
      fetchTranslation()
    }
  }, [entry, word])

  const fetchTranslation = async () => {
    try {
      // 先尝试翻译单词本身
      const response = await fetch(
        `/api/translate-word?word=${encodeURIComponent(word)}`
      )
      const data = await response.json()

      if (data.success && data.data.translation) {
        let translation = data.data.translation

        // 如果翻译包含英文原文，提取中文部分
        const chineseMatch = translation.match(/[\u4e00-\u9fa5，。、！？；：""''（）【】《》·…—]+/g)
        if (chineseMatch && chineseMatch.length > 0) {
          translation = chineseMatch.join('，')
        }

        setChineseTranslation(translation)
      } else {
        // 如果直接翻译失败，尝试翻译定义
        const definition = entry?.meanings?.[0]?.definitions?.[0]?.definition || ''
        if (definition) {
          const defResponse = await fetch(
            `/api/translate-word?word=${encodeURIComponent(definition)}`
          )
          const defData = await defResponse.json()

          if (defData.success && defData.data.translation) {
            let translation = defData.data.translation
            const chineseMatch = translation.match(/[\u4e00-\u9fa5，。、！？；：""''（）【】《》·…—]+/g)
            if (chineseMatch && chineseMatch.length > 0) {
              translation = chineseMatch.join('，')
            }
            setChineseTranslation(translation)
          }
        }
      }
    } catch (error) {
      console.error('获取中文翻译失败:', error)
    }
  }

  const handleSpeakUS = () => {
    speakWord(word, 'en-US')
    setPlayingUS(true)
    setTimeout(() => setPlayingUS(false), 1000)
  }

  const handleSpeakUK = () => {
    speakWord(word, 'en-GB')
    setPlayingUK(true)
    setTimeout(() => setPlayingUK(false), 1000)
  }

  if (loading) {
    return (
      <div className="bg-surface-light rounded-xl shadow-xl overflow-hidden min-w-[360px]">
        <div className="p-6 animate-pulse">
          <div className="h-7 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
          <div className="h-px bg-gray-700 my-4"></div>
          <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="bg-surface-light rounded-xl p-6 shadow-xl min-w-[360px]">
        {error ? (
          <div className="text-center">
            <p className="text-gray-400 mb-2">查询失败</p>
            <p className="text-gray-500 text-sm">{error}</p>
            <p className="text-gray-600 text-xs mt-3">
              提示：可能是网络问题或该单词不在词库中
            </p>
          </div>
        ) : (
          <p className="text-gray-400">暂无单词 "{word}" 的释义</p>
        )}
      </div>
    )
  }

  // 收集所有近义词和反义词（去重）
  const allSynonyms = entry.meanings && entry.meanings.length > 0
    ? Array.from(new Set(entry.meanings.flatMap(m => m.synonyms || []))).slice(0, 10)
    : []
  const allAntonyms = entry.meanings && entry.meanings.length > 0
    ? Array.from(new Set(entry.meanings.flatMap(m => m.antonyms || []))).slice(0, 10)
    : []

  // 确定显示的音标（优先使用API返回的，回退到通用音标）
  const usPhonetic = entry.usPhonetic || entry.phonetic
  const ukPhonetic = entry.ukPhonetic || entry.phonetic

  // 检查是否是回退条目（没有详细信息）
  const isFallbackEntry = entry.meanings && entry.meanings.length === 1 &&
                          entry.meanings[0].partOfSpeech === 'unknown' &&
                          entry.meanings[0].definitions[0]?.definition === '暂无详细释义，请查看中文翻译'

  return (
    <div className="bg-surface-light rounded-xl shadow-xl overflow-hidden min-w-[360px] max-w-[480px]">
      {/* 标题栏 - 单词大字显示 */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface">
        <h3 className="text-2xl font-heading font-bold text-white">{entry.word}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => speakWord(word)}
            className="p-1.5 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
            title="发音"
          >
            <Volume2 size={16} />
          </button>
          <button
            onClick={() => onSave?.(chineseTranslation)}
            className={`p-1.5 rounded-lg transition-colors ${
              isSaved
                ? 'text-accent bg-accent/20'
                : 'text-gray-400 hover:text-accent hover:bg-accent/10'
            }`}
            title={isSaved ? '已收藏' : '收藏'}
          >
            <Star size={16} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-3 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar text-sm">

        {/* 如果是回退条目，只显示基本信息 */}
        {isFallbackEntry ? (
          <>
            {/* 提示信息 */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
              <p className="text-yellow-400 text-sm">
                ⚠️ 词典API暂时不可用，仅显示中文翻译
              </p>
            </div>

            {/* 中文翻译区域 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-accent-2 text-xs font-medium">
                <Languages size={14} />
                <span>中文释义</span>
              </div>
              {chineseTranslation ? (
                <p className="text-white text-base leading-relaxed">{chineseTranslation}</p>
              ) : (
                <p className="text-gray-500 text-sm">正在获取翻译...</p>
              )}
            </div>

            {/* 发音按钮 */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSpeakUS}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-surface text-gray-300 rounded-lg hover:bg-surface-light transition-colors"
              >
                <Volume2 size={18} />
                美音发音
              </button>
              <button
                onClick={handleSpeakUK}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-surface text-gray-300 rounded-lg hover:bg-surface-light transition-colors"
              >
                <Volume2 size={18} />
                英音发音
              </button>
            </div>
          </>
        ) : (
          <>
            {/* === 音标区域 === */}
            {/* 美式和英式音标并排显示 */}
            <div className="flex items-center gap-2">
              {/* 美式音标 */}
              {usPhonetic ? (
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg px-3 py-2 flex-1">
                  <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800/50 px-1.5 py-0.5 rounded font-medium">美</span>
                  <span className="text-blue-600 dark:text-blue-400 font-mono text-sm">{usPhonetic}</span>
                  <button
                    onClick={handleSpeakUS}
                    className={`p-1 rounded-lg transition-colors ml-auto ${
                      playingUS
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800/50'
                        : 'text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/30'
                    }`}
                    title="美音发音"
                  >
                    <Volume2 size={14} />
                  </button>
                </div>
              ) : null}

              {/* 英式音标 */}
              {ukPhonetic ? (
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg px-3 py-2 flex-1">
                  <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800/50 px-1.5 py-0.5 rounded font-medium">英</span>
                  <span className="text-blue-600 dark:text-blue-400 font-mono text-sm">{ukPhonetic}</span>
                  <button
                    onClick={handleSpeakUK}
                    className={`p-1 rounded-lg transition-colors ml-auto ${
                      playingUK
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800/50'
                        : 'text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/30'
                    }`}
                    title="英音发音"
                  >
                    <Volume2 size={14} />
                  </button>
                </div>
              ) : null}

              {/* 无音标提示 */}
              {!usPhonetic && !ukPhonetic && (
                <div className="flex items-center justify-between bg-surface/50 rounded-lg px-3 py-2 w-full">
                  <span className="text-gray-500 text-xs">暂无音标</span>
                </div>
              )}
            </div>

            {/* 分隔线 */}
            <div className="h-px bg-gray-700"></div>

            {/* === 中文翻译区域 === */}
            {chineseTranslation && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-accent-2 text-xs font-medium">
                    <Languages size={14} />
                    <span>中文释义</span>
                  </div>
                  <p className="text-white text-base leading-relaxed">{chineseTranslation}</p>
                </div>

                {/* 分隔线 */}
                <div className="h-px bg-gray-700"></div>
              </>
            )}

            {/* === 词义、例句、近义词、反义词 === */}
            {entry.meanings && entry.meanings.length > 0 && entry.meanings.map((meaning, mIndex) => (
              <div key={mIndex} className="space-y-3">
                {/* 词性标签 */}
                <div className="flex items-center gap-2">
                  <span
                    className="px-3 py-1 rounded text-sm font-medium"
                    style={{
                      backgroundColor: `${getPartOfSpeechColor(meaning.partOfSpeech)}25`,
                      color: getPartOfSpeechColor(meaning.partOfSpeech)
                    }}
                  >
                    {meaning.partOfSpeech}
                  </span>
                </div>

                {/* 定义列表 */}
                <ul className="space-y-4">
                  {meaning.definitions.map((def, defIndex) => {
                    return (
                      <li key={defIndex} className="space-y-2">
                        {/* 英文释义 */}
                        {def.definition && (
                          <p className="text-gray-200 text-base leading-relaxed">{def.definition}</p>
                        )}

                        {/* 例句 */}
                        {def.example && (
                          <div className="ml-4 space-y-1">
                            <p className="text-gray-400 text-sm italic leading-relaxed">
                              "{def.example}"
                            </p>
                            {def.exampleTranslation && (
                              <p className="text-gray-500 text-sm ml-2">
                                <Languages size={12} className="inline mr-1 opacity-60" />
                                {def.exampleTranslation}
                              </p>
                            )}
                          </div>
                        )}

                        {/* 该定义的近义词 */}
                        {def.synonyms && def.synonyms.length > 0 && (
                          <div className="ml-4 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-500">同义词:</span>
                            {def.synonyms.slice(0, 4).map((syn, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-gray-400 rounded text-xs cursor-pointer hover:text-gray-300"
                                onClick={() => speakWord(syn)}
                              >
                                {syn}
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}

            {/* 分隔线 */}
            {entry.collocations && entry.collocations.length > 0 && (
              <div className="h-px bg-gray-700"></div>
            )}

            {/* === 常用搭配词 === */}
            {entry.collocations && entry.collocations.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                  <Link2 size={16} />
                  <span>常用搭配</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.collocations.map((collocation, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-surface text-gray-300 rounded-lg text-sm hover:bg-blue-500/20 hover:text-blue-300 transition-colors cursor-pointer"
                      onClick={() => speakWord(collocation)}
                    >
                      {collocation}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* 分隔线 */}
            {(allSynonyms.length > 0 || allAntonyms.length > 0) && (
              <div className="h-px bg-gray-700"></div>
            )}

            {/* === 全部近义词 === */}
            {allSynonyms.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                  <span>近义词</span>
                  <span className="text-gray-500 text-xs">({allSynonyms.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allSynonyms.map((synonym, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 text-gray-400 rounded-lg text-sm hover:text-gray-300 transition-colors cursor-pointer"
                      onClick={() => speakWord(synonym)}
                    >
                      {synonym}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* === 全部反义词 === */}
            {allAntonyms.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                  <span>反义词</span>
                  <span className="text-gray-500 text-xs">({allAntonyms.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allAntonyms.map((antonym, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 text-gray-400 rounded-lg text-sm hover:text-gray-300 transition-colors cursor-pointer"
                      onClick={() => speakWord(antonym)}
                    >
                      {antonym}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* 底部间距 */}
            <div className="h-2"></div>
          </>
        )}
      </div>
    </div>
  )
}
