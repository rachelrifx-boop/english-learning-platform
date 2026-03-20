'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Pause, RotateCcw } from 'lucide-react'

interface VoiceRecorderProps {
  onRecordingComplete?: (audioBlob: Blob) => void
  referenceText?: string
}

export function VoiceRecorder({ onRecordingComplete, referenceText }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [waveform, setWaveform] = useState<number[]>([])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animationFrameRef = useRef<number>()
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // 设置音频分析器
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      analyser.fftSize = 256

      analyserRef.current = analyser
      audioContextRef.current = audioContext

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        const url = URL.createObjectURL(audioBlob)
        setAudioURL(url)
        onRecordingComplete?.(audioBlob)

        // 停止所有轨道
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // 更新波形
      const updateWaveform = () => {
        if (!isRecording || !analyserRef.current) return

        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyserRef.current.getByteFrequencyData(dataArray)

        // 取简单的波形数据
        const waveData = Array.from({ length: 50 }, (_, i) => {
          const index = Math.floor(i * bufferLength / 50)
          return dataArray[index] / 255
        })

        setWaveform(waveData)
        animationFrameRef.current = requestAnimationFrame(updateWaveform)
      }

      updateWaveform()

      // 计时器
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('无法访问麦克风:', error)
      alert('无法访问麦克风，请检查权限设置')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      // 清除计时器
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      // 重置波形
      setWaveform([])
    }
  }

  const playRecording = () => {
    if (!audioURL) return

    if (isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioURL)
        audioRef.current.onended = () => setIsPlaying(false)
      }
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const resetRecording = () => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL)
      setAudioURL(null)
    }
    audioRef.current = null
    setRecordingTime(0)
    setWaveform([])
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-surface-light rounded-xl p-6">
      {/* 参考文本 */}
      {referenceText && (
        <div className="mb-4 p-3 bg-surface rounded-lg">
          <p className="text-sm text-gray-400 mb-1">跟读内容</p>
          <p className="text-white">{referenceText}</p>
        </div>
      )}

      {/* 波形显示 */}
      <div className="h-24 mb-4 flex items-center justify-center gap-1 bg-surface rounded-lg overflow-hidden">
        {isRecording && waveform.length > 0 ? (
          waveform.map((value, index) => (
            <div
              key={index}
              className="w-1 bg-accent rounded-full transition-all duration-75"
              style={{ height: `${Math.max(20, value * 100)}%` }}
            />
          ))
        ) : audioURL ? (
          <div className="flex items-center gap-2 text-gray-400">
            <RotateCcw size={20} />
            <span className="text-sm">录音完成</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500">
            <Mic size={20} />
            <span className="text-sm">点击开始录音</span>
          </div>
        )}
      </div>

      {/* 录音时间 */}
      {isRecording && (
        <div className="text-center mb-4">
          <span className="text-accent font-mono text-xl">{formatTime(recordingTime)}</span>
        </div>
      )}

      {/* 控制按钮 */}
      <div className="flex items-center justify-center gap-4">
        {!isRecording && !audioURL && (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Mic size={20} />
            开始录音
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Square size={20} />
            停止录音
          </button>
        )}

        {audioURL && (
          <>
            <button
              onClick={playRecording}
              className="flex items-center gap-2 px-6 py-3 bg-surface text-gray-300 hover:text-white rounded-lg hover:bg-surface-light transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              {isPlaying ? '暂停' : '播放'}
            </button>

            <button
              onClick={resetRecording}
              className="flex items-center gap-2 px-6 py-3 bg-surface text-gray-300 hover:text-white rounded-lg hover:bg-surface-light transition-colors"
            >
              <RotateCcw size={20} />
              重新录音
            </button>
          </>
        )}
      </div>

      {/* 提示 */}
      {!isRecording && !audioURL && (
        <p className="text-center text-gray-500 text-sm mt-4">
          确保允许浏览器访问麦克风权限
        </p>
      )}
    </div>
  )
}
