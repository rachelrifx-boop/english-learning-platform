'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Star, Trash2, Download, Volume2, X, Languages, Link2, Headphones } from 'lucide-react'
import { speakWord, getPartOfSpeechColor } from '@/lib/dictionary-api'
import { WordCard, DictionaryEntry } from '@/components/WordCard'

// 格式化时间函数
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 将数据库中的单词转换为 DictionaryEntry 格式
const convertToDictionaryEntry = (word: Word): DictionaryEntry => {
  return {
    word: word.word,
    phonetic: (word.usPhonetic || word.ukPhonetic) ?? undefined,
    usPhonetic: word.usPhonetic ?? undefined,
    ukPhonetic: word.ukPhonetic ?? undefined,
    meanings: [
      {
        partOfSpeech: word.partOfSpeech || 'noun',
        definitions: [
          {
            definition: word.definition || '',
            example: word.sentence || undefined,
            exampleTranslation: word.sentenceTranslation || undefined,
            synonyms: word.synonyms ? JSON.parse(word.synonyms).slice(0, 4) : undefined,
            antonyms: word.antonyms ? JSON.parse(word.antonyms).slice(0, 4) : undefined,
          }
        ],
        synonyms: word.synonyms ? JSON.parse(word.synonyms) : [],
        antonyms: word.antonyms ? JSON.parse(word.antonyms) : [],
      }
    ],
    collocations: word.collocations ? JSON.parse(word.collocations) : [],
  }
}

// 单词卡片组件（带删除功能）
function SavedWordCard({
  word,
  onDelete,
  onSpeak
}: {
  word: Word
  onDelete: () => void
  onSpeak: (word: string) => void
}) {
  const [playingUS, setPlayingUS] = useState(false)
  const [playingUK, setPlayingUK] = useState(false)
  const entry = convertToDictionaryEntry(word)

  const usPhonetic = entry.usPhonetic || entry.phonetic
  const ukPhonetic = entry.ukPhonetic || entry.phonetic

  // 收集所有近义词和反义词（去重）
  const allSynonyms = Array.from(new Set(entry.meanings.flatMap(m => m.synonyms || []))).slice(0, 10)
  const allAntonyms = Array.from(new Set(entry.meanings.flatMap(m => m.antonyms || []))).slice(0, 10)

  const handleSpeakUS = () => {
    onSpeak(word.word)
    setPlayingUS(true)
    setTimeout(() => setPlayingUS(false), 1000)
  }

  const handleSpeakUK = () => {
    onSpeak(word.word)
    setPlayingUK(true)
    setTimeout(() => setPlayingUK(false), 1000)
  }

  return (
    <div className="bg-surface-light rounded-xl shadow-xl overflow-hidden">
      {/* 标题栏 - 单词大字显示 */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface">
        <h3 className="text-2xl font-heading font-bold text-white">{entry.word}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => speakWord(word.word)}
            className="p-1.5 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
            title="发音"
          >
            <Volume2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            title="删除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-3 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar text-sm">

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
        {word.translation && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-accent-2 text-xs font-medium">
                <Languages size={14} />
                <span>中文释义</span>
              </div>
              <p className="text-white text-base leading-relaxed">{word.translation}</p>
            </div>

            {/* 分隔线 */}
            <div className="h-px bg-gray-700"></div>
          </>
        )}

        {/* === 词义、例句、近义词、反义词 === */}
        {entry.meanings.map((meaning, mIndex) => (
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
                // 计算例句的全局索引
                const globalIndex = entry.meanings.slice(0, mIndex)
                  .reduce((sum, m) => sum + m.definitions.filter(d => d.example).length, 0) +
                  entry.meanings[mIndex].definitions.slice(0, defIndex)
                  .filter(d => d.example).length

                return (
                  <li key={defIndex} className="space-y-2">
                    {/* 英文释义 */}
                    <p className="text-gray-200 text-base leading-relaxed">{def.definition}</p>

                    {/* 例句 */}
                    {def.example && (
                      <div className="ml-4 space-y-1">
                        <p className="text-gray-400 text-sm italic leading-relaxed">
                          "{def.example}"
                        </p>
                        {(def.exampleTranslation || word.sentenceTranslation) && (
                          <p className="text-gray-500 text-sm ml-2">
                            <Languages size={12} className="inline mr-1 opacity-60" />
                            {def.exampleTranslation || word.sentenceTranslation}
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
                            onClick={() => onSpeak(syn)}
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
                  onClick={() => onSpeak(collocation)}
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
                  onClick={() => onSpeak(synonym)}
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
                  onClick={() => onSpeak(antonym)}
                >
                  {antonym}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* 视频来源信息 */}
        {word.timestamp && (
          <div className="pt-3 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              来自: {word.video.title} - {formatTime(word.timestamp)}
            </p>
          </div>
        )}

        {/* 底部间距 */}
        <div className="h-2"></div>
      </div>
    </div>
  )
}

interface Word {
  id: string
  word: string
  definition: string | null
  translation: string | null
  partOfSpeech: string | null
  sentence: string | null
  sentenceTranslation: string | null
  usPhonetic: string | null
  ukPhonetic: string | null
  collocations: string | null
  synonyms: string | null
  antonyms: string | null
  timestamp: number | null
  createdAt: string
  video: {
    title: string
  }
}

interface Expression {
  id: string
  text: string
  translation: string
  timestamp: number
  createdAt: string
  video: {
    title: string
  }
}

type TabType = 'words' | 'expressions'
type ReviewMode = 'list' | 'flashcard'

export default function VocabularyPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('words')
  const [reviewMode, setReviewMode] = useState<ReviewMode>('list')
  const [words, setWords] = useState<Word[]>([])
  const [expressions, setExpressions] = useState<Expression[]>([])
  const [loading, setLoading] = useState(true)

  // Flashcard 状态
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showCardBack, setShowCardBack] = useState(false)

  // 初始加载时同时获取单词和表达的数据
  useEffect(() => {
    fetchAllData()
  }, [])

  // 切换标签时也重新获取对应的数据
  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      // 同时获取单词和表达的数据
      const [wordsResponse, expressionsResponse] = await Promise.all([
        fetch('/api/words'),
        fetch('/api/expressions')
      ])

      const wordsData = await wordsResponse.json()
      const expressionsData = await expressionsResponse.json()

      if (wordsData.success) {
        setWords(wordsData.data.words)
      }

      if (expressionsData.success) {
        setExpressions(expressionsData.data.expressions)
      }
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchData = async () => {
    // 不需要额外加载，因为 fetchAllData 已经加载了所有数据
    // 这里只是为了确保切换标签时数据是最新的
    try {
      const endpoint = activeTab === 'words' ? '/api/words' : '/api/expressions'
      const response = await fetch(endpoint)
      const data = await response.json()

      if (data.success) {
        if (activeTab === 'words') {
          setWords(data.data.words)
        } else {
          setExpressions(data.data.expressions)
        }
      }
    } catch (error) {
      console.error('获取数据失败:', error)
    }
  }

  const deleteItem = async (id: string) => {
    if (!confirm('确定要删除吗？')) return

    try {
      const endpoint = activeTab === 'words' ? `/api/words?id=${id}` : `/api/expressions?id=${id}`
      const response = await fetch(endpoint, { method: 'DELETE' })
      const data = await response.json()

      if (data.success) {
        // 重新获取所有数据以更新计数
        await fetchAllData()
      }
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const speakWordItem = (word: string) => {
    speakWord(word)
  }

  // Flashcard 操作
  const nextCard = () => {
    setShowCardBack(false)
    const maxIndex = activeTab === 'words' ? words.length : expressions.length
    setCurrentCardIndex((prev) => (prev + 1) % maxIndex)
  }

  const prevCard = () => {
    setShowCardBack(false)
    const maxIndex = activeTab === 'words' ? words.length : expressions.length
    setCurrentCardIndex((prev) => (prev - 1 + maxIndex) % maxIndex)
  }

  // 导出 PDF - 使用浏览器原生打印功能支持中文
  const exportToPDF = () => {
    // 创建打印专用的HTML内容
    const printContent = document.createElement('div')
    printContent.style.cssText = 'position:absolute;left:-9999px;top:0;width:210mm;padding:20px;font-family:Arial,sans-serif;background:white;color:black;'

    let html = `
      <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #333;padding-bottom:20px;">
        <h1 style="margin:0;font-size:24px;">${activeTab === 'words' ? '单词本' : '表达卡片'}</h1>
        <p style="margin:10px 0 0 0;color:#666;">导出时间: ${new Date().toLocaleString('zh-CN')}</p>
      </div>
    `

    if (activeTab === 'words') {
      words.forEach((word, index) => {
        const collocations = word.collocations ? JSON.parse(word.collocations) : []
        const synonyms = word.synonyms ? JSON.parse(word.synonyms) : []
        const antonyms = word.antonyms ? JSON.parse(word.antonyms) : []

        html += `
          <div style="page-break-inside:avoid;margin-bottom:30px;padding:15px;border:1px solid #ddd;border-radius:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <h2 style="margin:0;font-size:20px;color:#4F8EF7;">${index + 1}. ${word.word}</h2>
              <span style="background:${getPartOfSpeechColor(word.partOfSpeech || 'noun')}20;color:${getPartOfSpeechColor(word.partOfSpeech || 'noun')};padding:4px 12px;border-radius:4px;font-size:12px;">${word.partOfSpeech || 'noun'}</span>
            </div>

            ${word.usPhonetic || word.ukPhonetic ? `
              <div style="margin-bottom:10px;font-size:14px;color:#666;">
                ${word.usPhonetic ? `<span>美式: /${word.usPhonetic}/</span>` : ''}
                ${word.ukPhonetic ? `<span style="margin-left:15px;">英式: /${word.ukPhonetic}/</span>` : ''}
              </div>
            ` : ''}

            ${word.translation ? `
              <div style="margin-bottom:10px;">
                <strong style="color:#8B5CF6;">中文释义:</strong> <span style="font-size:16px;">${word.translation}</span>
              </div>
            ` : ''}

            ${word.definition ? `
              <div style="margin-bottom:10px;">
                <strong>英文释义:</strong> ${word.definition}
              </div>
            ` : ''}

            ${word.sentence ? `
              <div style="margin-bottom:10px;padding:10px;background:#f5f5f5;border-radius:4px;">
                <div style="font-style:italic;color:#555;">"${word.sentence}"</div>
                ${word.sentenceTranslation ? `<div style="margin-top:5px;color:#888;font-size:14px;">↳ ${word.sentenceTranslation}</div>` : ''}
              </div>
            ` : ''}

            ${collocations.length > 0 ? `
              <div style="margin-bottom:10px;">
                <strong style="color:#3B82F6;">常用搭配:</strong>
                <div style="margin-top:5px;">${collocations.map((c: string) => `<span style="display:inline-block;background:#EBF5FF;color:#3B82F6;padding:4px 10px;margin:3px;border-radius:4px;font-size:13px;">${c}</span>`).join('')}</div>
              </div>
            ` : ''}

            ${synonyms.length > 0 ? `
              <div style="margin-bottom:10px;">
                <strong style="color:#22C55E;">近义词:</strong>
                <div style="margin-top:5px;">${synonyms.map((s: string) => `<span style="display:inline-block;background:#ECFDF5;color:#22C55E;padding:4px 10px;margin:3px;border-radius:4px;font-size:13px;">${s}</span>`).join('')}</div>
              </div>
            ` : ''}

            ${antonyms.length > 0 ? `
              <div style="margin-bottom:10px;">
                <strong style="color:#EF4444;">反义词:</strong>
                <div style="margin-top:5px;">${antonyms.map((a: string) => `<span style="display:inline-block;background:#FEF2F2;color:#EF4444;padding:4px 10px;margin:3px;border-radius:4px;font-size:13px;">${a}</span>`).join('')}</div>
              </div>
            ` : ''}

            ${word.timestamp ? `
              <div style="margin-top:10px;padding-top:10px;border-top:1px solid #eee;font-size:12px;color:#999;">
                来自: ${word.video.title} - ${formatTime(word.timestamp)}
              </div>
            ` : ''}
          </div>
        `
      })
    } else {
      expressions.forEach((expr, index) => {
        html += `
          <div style="page-break-inside:avoid;margin-bottom:20px;padding:15px;border:1px solid #ddd;border-radius:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <h3 style="margin:0;font-size:18px;color:#4F8EF7;">${index + 1}. ${expr.text}</h3>
              <span style="font-family:monospace;color:#4F8EF7;">${formatTime(expr.timestamp)}</span>
            </div>
            <p style="margin:10px 0;color:#666;font-size:16px;">${expr.translation}</p>
            <p style="margin:0;color:#999;font-size:13px;">来自: ${expr.video.title}</p>
          </div>
        `
      })
    }

    printContent.innerHTML = html
    document.body.appendChild(printContent)

    // 使用浏览器打印对话框
    const originalTitle = document.title
    document.title = activeTab === 'words' ? '单词本.pdf' : '表达卡片.pdf'

    window.print()

    // 恢复并清理
    setTimeout(() => {
      document.title = originalTitle
      document.body.removeChild(printContent)
    }, 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    )
  }

  const itemCount = activeTab === 'words' ? words.length : expressions.length

  return (
    <div className="min-h-screen bg-primary">
      {/* 顶部导航 */}
      <header className="bg-surface-light border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <BookOpen className="text-accent" size={24} />
              <h1 className="text-xl font-heading font-bold text-white">
                单词本
              </h1>
            </div>

            <button
              onClick={() => router.push('/')}
              className="text-gray-300 hover:text-accent transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 标签页切换 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => {
                setActiveTab('words')
                setCurrentCardIndex(0)
                setShowCardBack(false)
              }}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'words'
                  ? 'bg-accent text-white'
                  : 'bg-surface-light text-gray-300 hover:text-white'
              }`}
            >
              单词 ({words.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('expressions')
                setCurrentCardIndex(0)
                setShowCardBack(false)
              }}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'expressions'
                  ? 'bg-accent text-white'
                  : 'bg-surface-light text-gray-300 hover:text-white'
              }`}
            >
              表达 ({expressions.length})
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setReviewMode(reviewMode === 'list' ? 'flashcard' : 'list')}
              className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                reviewMode === 'flashcard' ? 'bg-accent text-white' : 'bg-surface-light text-gray-300 hover:text-white'
              }`}
              title="切换复习模式"
            >
              复习模式
            </button>
            {itemCount > 0 && (
              <button
                onClick={exportToPDF}
                className="p-2 bg-surface-light text-gray-300 hover:text-white rounded-lg transition-colors"
                title="导出 PDF"
              >
                <Download size={20} />
              </button>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        {itemCount === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Star size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">
              {activeTab === 'words' ? '还没有收藏的单词' : '还没有收藏的表达'}
            </p>
            <p>观看视频时点击收藏按钮添加内容</p>
          </div>
        ) : reviewMode === 'list' ? (
          /* 列表模式 */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTab === 'words' ? (
              words.map((word) => (
                <SavedWordCard
                  key={word.id}
                  word={word}
                  onDelete={() => deleteItem(word.id)}
                  onSpeak={speakWordItem}
                />
              ))
            ) : (
              expressions.map((expr) => (
                <div key={expr.id} className="bg-surface-light rounded-xl p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-accent text-sm">
                      <span className="font-mono">{formatTime(expr.timestamp)}</span>
                    </div>
                    <button
                      onClick={() => deleteItem(expr.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <p className="text-white font-medium mb-2">{expr.text}</p>
                  <p className="text-gray-400 text-sm mb-3">{expr.translation}</p>

                  <div className="pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-500">{expr.video.title}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Flashcard 模式 */
          <div className="max-w-2xl mx-auto">
            <div className="bg-surface-light rounded-xl p-8">
              {/* 卡片计数 */}
              <div className="text-center text-gray-400 mb-4">
                {currentCardIndex + 1} / {itemCount}
              </div>

              {/* 卡片 */}
              <div
                className="min-h-[300px] flex items-center justify-center cursor-pointer"
                onClick={() => setShowCardBack(!showCardBack)}
              >
                {activeTab === 'words' ? (
                  showCardBack ? (
                    <div className="text-center w-full px-8">
                      <p className="text-gray-400 text-sm mb-2">定义</p>
                      <p className="text-white text-xl mb-4">{words[currentCardIndex]?.definition}</p>
                      {words[currentCardIndex]?.translation && (
                        <>
                          <p className="text-gray-400 text-sm mb-2">中文</p>
                          <p className="text-accent text-xl mb-4">{words[currentCardIndex].translation}</p>
                        </>
                      )}
                      {words[currentCardIndex]?.sentence && (
                        <div className="mb-4">
                          <p className="text-gray-400 text-sm mb-1">例句</p>
                          <p className="text-gray-300 text-sm italic">"{words[currentCardIndex].sentence}"</p>
                          {words[currentCardIndex].sentenceTranslation && (
                            <p className="text-gray-500 text-sm mt-1">{words[currentCardIndex].sentenceTranslation}</p>
                          )}
                        </div>
                      )}
                      {/* 近义词和反义词 */}
                      {(() => {
                        const currentWord = words[currentCardIndex]
                        if (!currentWord) return null
                        const synonyms = currentWord.synonyms ? JSON.parse(currentWord.synonyms) : []
                        const antonyms = currentWord.antonyms ? JSON.parse(currentWord.antonyms) : []
                        if (synonyms.length === 0 && antonyms.length === 0) return null
                        return (
                          <div className="mt-4 pt-4 border-t border-gray-700">
                            {synonyms.length > 0 && (
                              <div className="mb-2">
                                <p className="text-xs text-gray-500 mb-1">近义词</p>
                                <div className="flex flex-wrap justify-center gap-1">
                                  {synonyms.slice(0, 4).map((syn: string, idx: number) => (
                                    <span key={idx} className="px-2 py-0.5 text-gray-400 rounded text-xs">
                                      {syn}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {antonyms.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">反义词</p>
                                <div className="flex flex-wrap justify-center gap-1">
                                  {antonyms.slice(0, 4).map((ant: string, idx: number) => (
                                    <span key={idx} className="px-2 py-0.5 text-gray-400 rounded text-xs">
                                      {ant}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  ) : (
                    <div className="text-center">
                      <h2 className="text-4xl font-heading font-bold text-white mb-4">
                        {words[currentCardIndex]?.word}
                      </h2>
                      {/* 音标显示 */}
                      <div className="flex justify-center items-center gap-4 mb-3">
                        {words[currentCardIndex]?.usPhonetic && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">美</span>
                            <span className="text-sm text-gray-400 font-mono">{words[currentCardIndex].usPhonetic}</span>
                          </div>
                        )}
                        {words[currentCardIndex]?.ukPhonetic && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">英</span>
                            <span className="text-sm text-gray-400 font-mono">{words[currentCardIndex].ukPhonetic}</span>
                          </div>
                        )}
                      </div>
                      {words[currentCardIndex]?.partOfSpeech && (
                        <span
                          className="px-3 py-1 rounded text-sm"
                          style={{
                            backgroundColor: `${getPartOfSpeechColor(words[currentCardIndex].partOfSpeech!)}20`,
                            color: getPartOfSpeechColor(words[currentCardIndex].partOfSpeech!)
                          }}
                        >
                          {words[currentCardIndex].partOfSpeech}
                        </span>
                      )}
                    </div>
                  )
                ) : showCardBack ? (
                  <div className="text-center">
                    <p className="text-gray-400 text-sm mb-2">中文</p>
                    <p className="text-white text-xl">{expressions[currentCardIndex]?.translation}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-400 text-sm mb-2">英文</p>
                    <p className="text-white text-xl leading-relaxed">{expressions[currentCardIndex]?.text}</p>
                  </div>
                )}
              </div>

              {/* 导航按钮 */}
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={prevCard}
                  className="px-6 py-2 bg-surface text-gray-300 hover:text-white rounded-lg transition-colors"
                >
                  上一张
                </button>
                <button
                  onClick={() => {
                    if (activeTab === 'words') {
                      speakWordItem(words[currentCardIndex]?.word || '')
                    }
                  }}
                  className="px-6 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  发音
                </button>
                <button
                  onClick={nextCard}
                  className="px-6 py-2 bg-surface text-gray-300 hover:text-white rounded-lg transition-colors"
                >
                  下一张
                </button>
              </div>

              <p className="text-center text-gray-500 text-sm mt-4">点击卡片翻转</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
