'use client'

import { useState, useEffect, useRef } from 'react'
import { Scroll, Play, Book, Star, FileText, Mic, Copy, Volume2, X, Headphones, PenTool, Eye, EyeOff, Edit2, Languages } from 'lucide-react'
import { VoiceRecorder } from './VoiceRecorder'
import { SentencePhoneticsDisplay } from './SentencePhonetics'
import { EnhancedSubtitleHighlight } from './EnhancedSubtitleHighlight'
import { WordCard, DictionaryEntry } from './WordCard'
import { IntensiveListeningPanel } from './IntensiveListeningPanel'
import { DictationPanel } from './DictationPanel'
import { SubtitleEditor } from './SubtitleEditor'
import { SubtitleTextRenderer } from './SubtitleTextRenderer'
import { ChineseSubtitleHighlight } from './ChineseSubtitleHighlight'
import { HighlightInfo } from './EnhancedSubtitleHighlight'

export interface SubtitleEntry {
  id: number
  startTime: number
  endTime: number
  text: {
    en: string
    zh: string
  }
}

interface SubtitlePanelProps {
  subtitles: SubtitleEntry[]
  currentTime: number
  currentSubtitle?: SubtitleEntry | null
  onSubtitleClick?: (subtitleId: number, time: number, shouldPlay?: boolean, endTime?: number) => void
  subtitleMode?: 'bilingual' | 'en' | 'zh'
  onSubtitleModeChange?: (mode: 'bilingual' | 'en' | 'zh') => void
  onPlay?: () => void
  onTogglePhonetics?: () => void
  showPhonetics?: boolean
  onCopy?: () => void
  onToggleFavorite?: (subtitle: SubtitleEntry) => void
  isFavorite?: boolean
  savedExpressions?: Map<string, { id: string; text: string }>
  onToggleNotes?: () => void
  showNotes?: boolean
  noteText?: string
  onNoteChange?: (text: string) => void
  onSaveNote?: () => void
  notes?: Array<{ id: string; text: string; timestamp: number; subtitleText: string }>
  onToggleRecorder?: () => void
  showRecorder?: boolean
  savedWords?: Set<string>
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
  }) => Promise<void>
  isVideoVisible?: boolean
  onToggleVideoVisibility?: () => void
  fontSize?: number
  isAdmin?: boolean
  videoId?: string
  onSubtitleUpdate?: (subtitleId: number, enText: string, zhText: string) => Promise<void>
  hideHeader?: boolean
  isMobile?: boolean
  mobileFunctionMode?: 'none' | 'follow' | 'dictation'
}

export function SubtitlePanel({
  subtitles,
  currentTime,
  currentSubtitle,
  onSubtitleClick,
  subtitleMode = 'bilingual',
  onSubtitleModeChange,
  onPlay,
  onTogglePhonetics,
  showPhonetics,
  onCopy,
  onToggleFavorite,
  isFavorite,
  savedExpressions,
  onToggleNotes,
  showNotes,
  noteText,
  onNoteChange,
  onSaveNote,
  notes,
  onToggleRecorder,
  showRecorder,
  savedWords,
  onWordSave,
  isVideoVisible = true,
  onToggleVideoVisibility,
  fontSize = 16,
  isAdmin = false,
  videoId,
  onSubtitleUpdate,
  hideHeader = false,
  isMobile = false,
  mobileFunctionMode = 'none',
}: SubtitlePanelProps) {
  const [autoScroll, setAutoScroll] = useState(true)
  const [expandedSubtitle, setExpandedSubtitle] = useState<number | null>(null)
  const [popupWord, setPopupWord] = useState<string | null>(null)
  const [dictionaryEntry, setDictionaryEntry] = useState<DictionaryEntry | null>(null)
  const [loadingDict, setLoadingDict] = useState(false)
  const [intensiveListeningSubtitle, setIntensiveListeningSubtitle] = useState<SubtitleEntry | null>(null)
  const [dictationSubtitle, setDictationSubtitle] = useState<SubtitleEntry | null>(null)
  const [editingSubtitle, setEditingSubtitle] = useState<SubtitleEntry | null>(null)
  const [subtitlesVisible, setSubtitlesVisible] = useState(true)
  const [subtitleHighlights, setSubtitleHighlights] = useState<Map<number, HighlightInfo[]>>(new Map())
  const activeSubtitleRef = useRef<HTMLDivElement>(null)

  // 找到当前激活的字幕
  const activeIndex = subtitles.findIndex(
    (sub) => currentTime >= sub.startTime / 1000 && currentTime <= sub.endTime / 1000
  )

  // 处理字幕高亮信息变化
  const handleHighlightInfoChange = (subtitleId: number, highlights: HighlightInfo[]) => {
    setSubtitleHighlights(prev => {
      const newMap = new Map(prev)
      if (highlights.length > 0) {
        newMap.set(subtitleId, highlights)
      } else {
        newMap.delete(subtitleId)
      }
      return newMap
    })
  }

  // 自动滚动到当前字幕
  useEffect(() => {
    if (activeIndex !== -1 && activeSubtitleRef.current) {
      activeSubtitleRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }, [activeIndex])

  // 获取单词释义
  useEffect(() => {
    const fetchWordDefinition = async () => {
      if (!popupWord) {
        setDictionaryEntry(null)
        return
      }

      setLoadingDict(true)
      try {
        const response = await fetch(`/api/words/lookup?word=${encodeURIComponent(popupWord)}`)
        const data = await response.json()
        if (data.success) {
          setDictionaryEntry(data.data.entry)
        } else {
          setDictionaryEntry(null)
        }
      } catch (error) {
        console.error('查词失败:', error)
        setDictionaryEntry(null)
      } finally {
        setLoadingDict(false)
      }
    }

    fetchWordDefinition()
  }, [popupWord])

  const handleClick = (subtitleId: number, time: number, shouldPlay = false, endTime?: number) => {
    // 移动端功能模式处理
    if (isMobile && mobileFunctionMode !== 'none') {
      const subtitle = subtitles.find(s => s.id === subtitleId)
      if (!subtitle) return

      if (mobileFunctionMode === 'follow') {
        // 跟读模式：展开跟读
        if (expandedSubtitle === subtitleId && showRecorder) {
          setExpandedSubtitle(null)
        } else {
          setExpandedSubtitle(subtitleId)
          onToggleRecorder?.()
        }
        return
      } else if (mobileFunctionMode === 'dictation') {
        // 听写模式：打开听写面板
        setDictationSubtitle(subtitle)
        return
      }
    }

    // 默认行为：点击字幕段落时播放语音
    // 直接调用父组件的函数，传递字幕ID和时间
    onSubtitleClick?.(subtitleId, time, shouldPlay, endTime)
  }

  const handlePlayClick = (subtitleId: number, startTime: number, endTime: number) => {
    // 播放按钮：根据自动滚动状态决定是否暂停
    // 如果自动滚动关闭，则播放完该字幕后暂停
    onSubtitleClick?.(subtitleId, startTime, true, autoScroll ? undefined : endTime)
  }

  const handleTogglePhonetics = (index: number) => {
    // 如果点击的是当前展开的字幕，则折叠；否则展开新的
    if (expandedSubtitle === index) {
      setExpandedSubtitle(null)
    } else {
      setExpandedSubtitle(index)
    }
    // 通知父组件显示音标
    onTogglePhonetics?.()
  }

  const handleToggleNotes = (index: number) => {
    // 如果点击的是当前展开的字幕，则折叠；否则展开新的
    if (expandedSubtitle === index) {
      setExpandedSubtitle(null)
    } else {
      setExpandedSubtitle(index)
    }
    // 通知父组件显示笔记
    onToggleNotes?.()
  }

  const handleToggleRecorder = (index: number) => {
    // 如果点击的是当前展开的字幕，则折叠；否则展开新的
    if (expandedSubtitle === index) {
      setExpandedSubtitle(null)
    } else {
      setExpandedSubtitle(index)
    }
    // 通知父组件显示录音
    onToggleRecorder?.()
  }

  if (subtitles.length === 0) {
    return (
      <div className="bg-surface-light rounded-xl p-6 text-center text-gray-400">
        <p>暂无字幕</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 - 移动端可隐藏 */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Scroll size={20} className="text-accent" />
            <h3 className="font-heading font-semibold text-white">字幕</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* 字幕语言切换按钮组 - 仅在非移动端且提供了回调函数时显示 */}
            {!isMobile && onSubtitleModeChange && (
              <div className="flex items-center gap-1 px-2 py-1 bg-surface-light rounded-lg">
                <button
                  onClick={() => onSubtitleModeChange('bilingual')}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    subtitleMode === 'bilingual'
                      ? 'bg-accent text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  双语
                </button>
                <button
                  onClick={() => onSubtitleModeChange('en')}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    subtitleMode === 'en'
                      ? 'bg-accent text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  英文
                </button>
                <button
                  onClick={() => onSubtitleModeChange('zh')}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    subtitleMode === 'zh'
                      ? 'bg-accent text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  中文
                </button>
              </div>
            )}
            {/* 字幕显示/隐藏按钮 */}
            <button
              onClick={() => setSubtitlesVisible(!subtitlesVisible)}
              className={`p-1.5 rounded-lg transition-colors ${
                subtitlesVisible
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-accent bg-accent/10'
              }`}
              title={subtitlesVisible ? '隐藏字幕' : '显示字幕'}
            >
              {subtitlesVisible ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="accent-accent"
              />
              自动滚动
            </label>
          </div>
        </div>
      )}

      {/* 移动端功能模式提示 */}
      {isMobile && mobileFunctionMode !== 'none' && (
        <div className="mx-4 mt-3 px-3 py-2 bg-accent/10 border border-accent/30 rounded-lg">
          <div className="flex items-center gap-2">
            {mobileFunctionMode === 'follow' && <Mic size={16} className="text-accent" />}
            {mobileFunctionMode === 'dictation' && <PenTool size={16} className="text-accent" />}
            <span className="text-sm text-accent font-medium">
              {mobileFunctionMode === 'follow' && '跟读模式：点击字幕开始跟读练习'}
              {mobileFunctionMode === 'dictation' && '听写模式：点击字幕开始听写练习'}
            </span>
          </div>
        </div>
      )}

      {/* 字幕列表 */}
      {subtitlesVisible && (
        <div className={isMobile ? "flex-1 overflow-y-scroll custom-scrollbar" : "h-[80vh] overflow-y-scroll custom-scrollbar"}>
          <div className="p-4 space-y-3">
            {subtitles.map((subtitle, index) => {
            const isActive = index === activeIndex
            const isExpanded = expandedSubtitle === index
            const isSubtitleSaved = savedExpressions?.has(subtitle.text.en) || false
            // 听写模式下隐藏对应的字幕行
            const isInDictation = dictationSubtitle?.id === subtitle.id

            if (isInDictation) return null

            return (
              <div
                key={subtitle.id}
                ref={isActive ? activeSubtitleRef : null}
                className={`rounded-lg transition-all ${
                  isActive ? 'bg-[#4F8EF7]/20 border border-[#4F8EF7]/30' : 'bg-surface'
                }`}
              >
                {/* 字幕主体 */}
                <div className="p-4">
                {/* 顶部行：时间戳 + 功能图标 */}
                <div className="flex items-start justify-between mb-2">
                  <div
                    onClick={() => handleClick(subtitle.id, subtitle.startTime / 1000, true, subtitle.endTime)}
                    className={`text-xs cursor-pointer ${isActive ? 'text-accent font-medium' : 'text-gray-500'}`}
                  >
                    {formatTime(subtitle.startTime / 1000)}
                  </div>

                  {/* 功能图标组 */}
                  <div className="flex items-center gap-1">
                    {/* 播放按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePlayClick(subtitle.id, subtitle.startTime / 1000, subtitle.endTime)
                      }}
                      className="p-1.5 text-gray-400 hover:text-accent hover:bg-accent/10 rounded transition-colors"
                      title="播放"
                    >
                      <Play size={14} />
                    </button>

                    {/* 音标按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTogglePhonetics(index)
                      }}
                      className={`p-1.5 rounded transition-colors ${
                        isExpanded && showPhonetics
                          ? 'text-accent bg-accent/10'
                          : 'text-gray-400 hover:text-accent hover:bg-accent/10'
                      }`}
                      title="音标"
                    >
                      <Book size={14} />
                    </button>

                    {/* 复制按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onCopy?.()
                      }}
                      className="p-1.5 text-gray-400 hover:text-accent hover:bg-accent/10 rounded transition-colors"
                      title="复制"
                    >
                      <Copy size={14} />
                    </button>

                    {/* 收藏按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleFavorite?.(subtitle)
                      }}
                      className={`p-1.5 rounded transition-colors ${
                        isSubtitleSaved
                          ? 'text-accent bg-accent/10'
                          : 'text-gray-400 hover:text-accent hover:bg-accent/10'
                      }`}
                      title={isSubtitleSaved ? '取消收藏' : '收藏'}
                    >
                      <Star size={14} fill={isSubtitleSaved ? 'currentColor' : 'none'} />
                    </button>

                    {/* 笔记按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleNotes(index)
                      }}
                      className={`p-1.5 rounded transition-colors ${
                        isExpanded && showNotes
                          ? 'text-accent bg-accent/10'
                          : 'text-gray-400 hover:text-accent hover:bg-accent/10'
                      }`}
                      title="笔记"
                    >
                      <FileText size={14} />
                    </button>

                    {/* 跟读按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleRecorder(index)
                      }}
                      className={`p-1.5 rounded transition-colors ${
                        isExpanded && showRecorder
                          ? 'text-accent bg-accent/10'
                          : 'text-gray-400 hover:text-accent hover:bg-accent/10'
                      }`}
                      title="跟读"
                    >
                      <Mic size={14} />
                    </button>

                    {/* 精听按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIntensiveListeningSubtitle(subtitle)
                      }}
                      className={`p-1.5 rounded transition-colors ${
                        intensiveListeningSubtitle?.id === subtitle.id
                          ? 'text-accent bg-accent/20'
                          : 'text-gray-400 hover:text-accent hover:bg-accent/10'
                      }`}
                      title="精听"
                    >
                      <Headphones size={14} />
                    </button>

                    {/* 听写按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDictationSubtitle(subtitle)
                      }}
                      className={`p-1.5 rounded transition-colors ${
                        dictationSubtitle?.id === subtitle.id
                          ? 'text-accent bg-accent/20'
                          : 'text-gray-400 hover:text-accent hover:bg-accent/10'
                      }`}
                      title="听写"
                    >
                      <PenTool size={14} />
                    </button>

                    {/* 编辑按钮 - 仅管理员可见 */}
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingSubtitle(subtitle)
                        }}
                        className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded transition-colors"
                        title="编辑字幕"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 英文字幕 - 支持HTML格式和单词点击 */}
                {subtitleMode !== 'zh' && (
                  <div
                    onClick={() => handleClick(subtitle.id, subtitle.startTime / 1000, true, subtitle.endTime)}
                    className="leading-relaxed cursor-pointer"
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    <EnhancedSubtitleHighlight
                      text={subtitle.text.en}
                      savedWords={savedWords || new Set()}
                      isActive={isActive}
                      onWordClick={setPopupWord}
                      onHighlightInfoChange={(highlights) => handleHighlightInfoChange(subtitle.id, highlights)}
                    />
                  </div>
                )}

                {/* 中文字幕 */}
                {(subtitleMode === 'bilingual' || subtitleMode === 'zh') && subtitle.text.zh && (
                  <div
                    onClick={() => handleClick(subtitle.id, subtitle.startTime / 1000, true, subtitle.endTime)}
                    className={`text-gray-400 cursor-pointer mt-1 ${isActive ? '!text-gray-300' : ''}`}
                    style={{ fontSize: `${fontSize * 0.85}px` }}
                  >
                    <ChineseSubtitleHighlight
                      chineseText={subtitle.text.zh}
                      englishText={subtitle.text.en}
                      englishHighlights={subtitleHighlights.get(subtitle.id) || []}
                      isActive={isActive}
                    />
                  </div>
                )}

                {/* 展开的音标显示 */}
                {isExpanded && showPhonetics && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <SentencePhoneticsDisplay
                      sentence={subtitle.text.en}
                    />
                  </div>
                )}

                {/* 展开的笔记输入 */}
                {isExpanded && showNotes && (
                  <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                    <textarea
                      value={noteText}
                      onChange={(e) => onNoteChange?.(e.target.value)}
                      placeholder="记录学习笔记..."
                      className="w-full h-20 bg-surface border border-gray-700 rounded p-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onSaveNote?.()
                        }}
                        className="px-3 py-1 bg-accent text-white rounded text-sm hover:opacity-90 transition-opacity"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                )}

                {/* 展开的跟读录音 */}
                {isExpanded && showRecorder && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <VoiceRecorder
                      referenceText={subtitle.text.en}
                      onRecordingComplete={(blob) => {
                        console.log('录音完成:', blob)
                        alert('录音完成！')
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}
        </div>
      </div>
      )}

      {/* 单词释义弹窗 */}
      {popupWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div onClick={(e) => e.stopPropagation()}>
            <WordCard
              word={popupWord}
              entry={dictionaryEntry}
              loading={loadingDict}
              isSaved={savedWords?.has(popupWord.toLowerCase())}
              onClose={() => setPopupWord(null)}
              onSave={(translation) => {
                if (onWordSave && dictionaryEntry) {
                  const firstMeaning = dictionaryEntry.meanings?.[0]
                  const firstDef = firstMeaning?.definitions?.[0]
                  onWordSave({
                    word: popupWord,
                    definition: firstDef?.definition || '',
                    translation,
                    partOfSpeech: firstMeaning?.partOfSpeech || '',
                    sentence: firstDef?.example,
                    usPhonetic: dictionaryEntry?.usPhonetic,
                    ukPhonetic: dictionaryEntry?.ukPhonetic,
                    collocations: dictionaryEntry?.collocations,
                    synonyms: dictionaryEntry?.meanings?.flatMap(m => m.synonyms || []),
                    antonyms: dictionaryEntry?.meanings?.flatMap(m => m.antonyms || [])
                  })
                }
              }}
            />
          </div>
        </div>
      )}

      {/* 精听控制面板 */}
      {intensiveListeningSubtitle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md">
            <IntensiveListeningPanel
              subtitle={intensiveListeningSubtitle}
              onClose={() => setIntensiveListeningSubtitle(null)}
            />
          </div>
        </div>
      )}

      {/* 听写控制面板 */}
      {dictationSubtitle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md">
            <DictationPanel
              subtitle={dictationSubtitle}
              allSubtitles={subtitles}
              onClose={() => setDictationSubtitle(null)}
              onNextSentence={(next) => setDictationSubtitle(next)}
            />
          </div>
        </div>
      )}

      {/* 字幕编辑器 - 仅管理员 */}
      {editingSubtitle && isAdmin && onSubtitleUpdate && (
        <SubtitleEditor
          subtitleId={editingSubtitle.id}
          enText={editingSubtitle.text.en}
          zhText={editingSubtitle.text.zh}
          onClose={() => setEditingSubtitle(null)}
          onSave={async (enText, zhText) => {
            await onSubtitleUpdate(editingSubtitle.id, enText, zhText)
            setEditingSubtitle(null)
          }}
        />
      )}
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
