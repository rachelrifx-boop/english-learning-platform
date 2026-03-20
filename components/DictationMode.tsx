'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, X, Eye, EyeOff, Volume2, RotateCcw, Lightbulb } from 'lucide-react'

interface DictationModeProps {
  sentence: string
  translation?: string
  onPlay?: () => void
  onComplete?: (success: boolean) => void
}

export function DictationMode({ sentence, translation, onPlay, onComplete }: DictationModeProps) {
  const [userInput, setUserInput] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [isChecked, setIsChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [hint, setHint] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 每次句子变化时重置状态
  useEffect(() => {
    setUserInput('')
    setShowAnswer(false)
    setIsChecked(false)
    setIsCorrect(false)
    setHint(0)
  }, [sentence])

  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s']/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const checkAnswer = () => {
    const normalizedInput = normalizeText(userInput)
    const normalizedSentence = normalizeText(sentence)
    const correct = normalizedInput === normalizedSentence

    setIsCorrect(correct)
    setIsChecked(true)
    onComplete?.(correct)
  }

  const getHint = () => {
    const words = sentence.split(' ')
    const wordsToShow = Math.min(hint + 1, words.length)
    setHint(wordsToShow)
  }

  const handlePlay = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(sentence)
      utterance.lang = 'en-US'
      utterance.rate = 0.7  // 听写时更慢
      speechSynthesis.speak(utterance)
      onPlay?.()
    }
  }

  const getRevealedText = () => {
    const words = sentence.split(' ')
    const wordsToShow = Math.min(hint, words.length)
    const revealedWords = words.slice(0, wordsToShow).join(' ')
    const hiddenWords = words.slice(wordsToShow).map(() => '___').join(' ')
    return revealedWords + (wordsToShow < words.length ? ' ' + hiddenWords : '')
  }

  return (
    <div className="bg-surface-light rounded-xl p-6 space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-heading font-semibold text-white flex items-center gap-2">
          <Lightbulb className="text-accent" size={20} />
          听写模式
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlay}
            className="p-2 text-gray-300 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
            title="播放句子"
          >
            <Volume2 size={18} />
          </button>
          <button
            onClick={() => setShowAnswer(!showAnswer)}
            className="p-2 text-gray-300 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
            title={showAnswer ? '隐藏答案' : '显示答案'}
          >
            {showAnswer ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* 提示 */}
      {showAnswer ? (
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
          <p className="text-sm text-accent mb-2">正确答案：</p>
          <p className="text-lg text-white mb-2">{sentence}</p>
          {translation && <p className="text-sm text-gray-400">{translation}</p>}
        </div>
      ) : hint > 0 && (
        <div className="bg-surface rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-2">提示 ({hint}/{sentence.split(' ').length} 词):</p>
          <p className="text-lg text-white font-mono">{getRevealedText()}</p>
        </div>
      )}

      {/* 输入区域 */}
      <div className="space-y-3">
        <textarea
          ref={inputRef}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="在这里输入你听到的内容..."
          className="w-full h-32 bg-surface border border-gray-700 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
          disabled={showAnswer}
        />

        {/* 结果反馈 */}
        {isChecked && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isCorrect ? (
              <>
                <Check size={18} />
                <span>完全正确！太棒了！</span>
              </>
            ) : (
              <>
                <X size={18} />
                <span>不太对，再试一次或查看答案</span>
              </>
            )}
          </div>
        )}

        {/* 按钮组 */}
        <div className="flex items-center gap-3 flex-wrap">
          {!showAnswer && (
            <>
              <button
                onClick={checkAnswer}
                disabled={!userInput.trim() || isChecked}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
              >
                <Check size={16} />
                检查答案
              </button>

              <button
                onClick={getHint}
                disabled={hint >= sentence.split(' ').length}
                className="px-4 py-2 bg-surface text-gray-300 rounded-lg hover:bg-surface-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                提示 ({hint}/{sentence.split(' ').length})
              </button>

              {isChecked && !isCorrect && (
                <button
                  onClick={() => {
                    setUserInput('')
                    setIsChecked(false)
                    setIsCorrect(false)
                    inputRef.current?.focus()
                  }}
                  className="px-4 py-2 bg-surface text-gray-300 rounded-lg hover:bg-surface-light transition-colors flex items-center gap-2"
                >
                  <RotateCcw size={16} />
                  重试
                </button>
              )}
            </>
          )}

          {isChecked && isCorrect && (
            <button
              onClick={() => {
                // 准备下一个句子的逻辑
                setUserInput('')
                setIsChecked(false)
                setIsCorrect(false)
                setHint(0)
              }}
              className="px-4 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              下一句
            </button>
          )}
        </div>
      </div>

      {/* 使用说明 */}
      {!isChecked && !showAnswer && (
        <div className="text-xs text-gray-500 space-y-1">
          <p>💡 听写技巧：</p>
          <ul className="list-disc list-inside space-y-1">
            <li>点击播放按钮反复听句子</li>
            <li>输入你听到的内容，可以多次修改</li>
            <li>遇到困难可以点击"提示"获取部分单词</li>
            <li>完成后点击"检查答案"查看结果</li>
          </ul>
        </div>
      )}
    </div>
  )
}
