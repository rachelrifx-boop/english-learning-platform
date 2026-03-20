import { spawn } from 'child_process'
import path from 'path'
import { promisify } from 'util'

// 模型类型配置
export type WhisperModelSize = 'tiny' | 'base' | 'small' | 'medium' | 'large-v3'

// 模型配置映射
const MODEL_CONFIGS: Record<WhisperModelSize, { modelId: string; accuracy: string; speed: string }> = {
  'tiny': { modelId: 'tiny', accuracy: '85%', speed: '⚡ 最快' },
  'base': { modelId: 'base', accuracy: '88%', speed: '🚀 快' },
  'small': { modelId: 'small', accuracy: '92%', speed: '⏱️ 中等' },
  'medium': { modelId: 'medium', accuracy: '94%', speed: '🐌 慢' },
  'large-v3': { modelId: 'large-v3', accuracy: '98%', speed: '🐢 最慢' }
}

/**
 * 使用本地 Whisper 生成字幕
 * @param audioPath 音频文件路径
 * @param modelSize 模型大小 (默认: small)
 * @returns SRT 格式字幕
 */
export async function generateSubtitlesWithLocalWhisper(
  audioPath: string,
  modelSize: WhisperModelSize = 'small'
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const config = MODEL_CONFIGS[modelSize]
      console.log(`使用本地 Whisper (${modelSize}) 生成字幕...`)
      console.log(`准确率: ${config.accuracy}, 速度: ${config.speed}`)

      // Python 脚本路径
      const scriptPath = path.join(process.cwd(), 'scripts', 'whisper-transcribe.py')

      // 设置环境变量，让模型缓存到 D 盘
      const env = {
        ...process.env,
        WHISPER_CACHE_DIR: 'D:\\WhisperModels',
        HF_ENDPOINT: 'https://hf-mirror.com'
      }

      // 启动 Python 进程
      // 将 Windows 路径的正斜杠确保正确传递给 Python
      const normalizedAudioPath = audioPath.replace(/\\/g, '/')
      const python = spawn('python', [scriptPath, normalizedAudioPath, config.modelId], {
        env,
        stdio: ['ignore', 'pipe', 'pipe']
      })

      let stdout = ''
      let stderr = ''

      // 收集输出
      python.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      python.stderr.on('data', (data) => {
        stderr += data.toString()
        // 实时输出进度信息
        const lines = stderr.toString().split('\n')
        lines.forEach(line => {
          if (line.trim()) {
            console.log(`[Whisper] ${line.trim()}`)
          }
        })
      })

      // 处理完成
      python.on('close', (code) => {
        if (code === 0) {
          const srtContent = stdout.trim()
          if (srtContent) {
            console.log('✅ 字幕生成成功')
            resolve(srtContent)
          } else {
            reject(new Error('字幕生成失败：输出为空'))
          }
        } else {
          console.error('Python 进程错误:', stderr)
          reject(new Error(`字幕生成失败，退出码: ${code}\n${stderr}`))
        }
      })

      // 处理错误
      python.on('error', (error) => {
        console.error('启动 Python 失败:', error)
        reject(new Error(`无法启动 Python: ${error.message}`))
      })

    } catch (error) {
      console.error('字幕生成失败:', error)
      reject(error)
    }
  })
}

/**
 * 获取模型信息
 */
export function getModelInfo(modelSize: WhisperModelSize) {
  return MODEL_CONFIGS[modelSize]
}

/**
 * 获取所有可用模型
 */
export function getAvailableModels() {
  return Object.entries(MODEL_CONFIGS).map(([size, config]) => ({
    size,
    modelId: config.modelId,
    accuracy: config.accuracy,
    speed: config.speed
  }))
}
