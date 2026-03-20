export interface User {
  id: string
  email: string
  username: string
  role: 'USER' | 'ADMIN'
  createdAt: Date
}

export interface Video {
  id: string
  title: string
  description: string | null
  filePath: string
  coverPath: string | null
  duration: number
  difficulty: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  category: string | null
  createdAt: Date
}

export interface SubtitleEntry {
  id: number
  startTime: number
  endTime: number
  text: {
    en: string
    zh: string
  }
}

export interface Word {
  id: string
  userId: string
  videoId: string
  word: string
  definition: string | null
  partOfSpeech: string | null
  sentence: string | null
  timestamp: number | null
  createdAt: Date
}

export interface Expression {
  id: string
  userId: string
  videoId: string
  text: string
  translation: string
  timestamp: number
  createdAt: Date
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}
