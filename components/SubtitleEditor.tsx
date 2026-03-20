'use client'

import { useState, useRef } from 'react'
import { X, Save, Bold, Italic, Underline, Highlighter } from 'lucide-react'

interface SubtitleEditorProps {
  subtitleId: number
  enText: string
  zhText: string
  onClose: () => void
  onSave: (enText: string, zhText: string) => Promise<void>
}

export function SubtitleEditor({
  subtitleId,
  enText,
  zhText,
  onClose,
  onSave
}: SubtitleEditorProps) {
  const [enValue, setEnValue] = useState(enText)
  const [zhValue, setZhValue] = useState(zhText)
  const [saving, setSaving] = useState(false)
  const enTextareaRef = useRef<HTMLTextAreaElement>(null)
  const zhTextareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(enValue, zhValue)
      onClose()
    } catch (error) {
      console.error('保存失败:', error)
      alert('保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  const insertTag = (tag: string, textareaId: 'en' | 'zh') => {
    const textarea = textareaId === 'en' ? enTextareaRef.current : zhTextareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textareaId === 'en' ? enValue : zhValue
    const selectedText = text.substring(start, end)

    let tagOpen = ''
    let tagClose = ''

    if (tag === 'underline') {
      tagOpen = '<u>'
      tagClose = '</u>'
    } else if (tag === 'background') {
      tagOpen = '<mark>'
      tagClose = '</mark>'
    } else if (tag === 'bold') {
      tagOpen = '<b>'
      tagClose = '</b>'
    } else if (tag === 'italic') {
      tagOpen = '<i>'
      tagClose = '</i>'
    }

    const newText = text.substring(0, start) + tagOpen + selectedText + tagClose + text.substring(end)

    if (textareaId === 'en') {
      setEnValue(newText)
    } else {
      setZhValue(newText)
    }

    // 使用 setTimeout 确保状态更新后再设置焦点和光标位置
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + tagOpen.length + selectedText.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface-light rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">编辑字幕</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* 英文字幕 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">英文字幕</label>
              <div className="flex gap-1">
                <button
                  onClick={() => insertTag('bold', 'en')}
                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                  title="粗体"
                >
                  <Bold size={16} className="text-gray-400" />
                </button>
                <button
                  onClick={() => insertTag('italic', 'en')}
                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                  title="斜体"
                >
                  <Italic size={16} className="text-gray-400" />
                </button>
                <button
                  onClick={() => insertTag('underline', 'en')}
                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                  title="下划线"
                >
                  <Underline size={16} className="text-gray-400" />
                </button>
                <button
                  onClick={() => insertTag('background', 'en')}
                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                  title="背景高亮"
                >
                  <Highlighter size={16} className="text-gray-400" />
                </button>
              </div>
            </div>
            <textarea
              ref={enTextareaRef}
              value={enValue}
              onChange={(e) => setEnValue(e.target.value)}
              className="w-full h-24 bg-surface border border-gray-700 rounded-lg p-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
              placeholder="输入英文字幕..."
            />
          </div>

          {/* 中文字幕 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">中文字幕</label>
              <div className="flex gap-1">
                <button
                  onClick={() => insertTag('bold', 'zh')}
                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                  title="粗体"
                >
                  <Bold size={16} className="text-gray-400" />
                </button>
                <button
                  onClick={() => insertTag('italic', 'zh')}
                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                  title="斜体"
                >
                  <Italic size={16} className="text-gray-400" />
                </button>
                <button
                  onClick={() => insertTag('underline', 'zh')}
                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                  title="下划线"
                >
                  <Underline size={16} className="text-gray-400" />
                </button>
                <button
                  onClick={() => insertTag('background', 'zh')}
                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                  title="背景高亮"
                >
                  <Highlighter size={16} className="text-gray-400" />
                </button>
              </div>
            </div>
            <textarea
              ref={zhTextareaRef}
              value={zhValue}
              onChange={(e) => setZhValue(e.target.value)}
              className="w-full h-24 bg-surface border border-gray-700 rounded-lg p-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
              placeholder="输入中文字幕..."
            />
          </div>

          {/* 提示信息 */}
          <div className="text-xs text-gray-500 bg-gray-800/50 rounded-lg p-3">
            <p className="mb-1">💡 提示：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>选中文字后点击工具栏按钮添加格式</li>
              <li>支持的格式：粗体 &lt;b&gt;、斜体 &lt;i&gt;、下划线 &lt;u&gt;、背景 &lt;mark&gt;</li>
            </ul>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
