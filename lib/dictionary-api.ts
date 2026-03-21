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

// 简单的LRU缓存实现
class LRUCache<K, V> {
  private cache: Map<K, V>
  private maxSize: number

  constructor(maxSize: number = 500) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // 重新设置以更新访问顺序
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: K, value: V): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    // 如果超过最大大小，删除最旧的
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  clear(): void {
    this.cache.clear()
  }
}

// 创建全局缓存实例（在服务端会话期间持久化）
const wordCache = new LRUCache<string, DictionaryEntry>(500)

// 缓存空结果（避免重复查询不存在的单词）
const notFoundCache = new Set<string>()

/**
 * 简单的词形还原（Lemmatization）
 * 将复数、过去式等变形词转换为原形
 * 支持多级还原（如 concealers → concealer → conceal）
 */
function getLemma(word: string): string | null {
  // 常见的复数后缀
  const pluralSuffixes = [
    { suffix: 'ses', replace: 's' },     // classes → class
    { suffix: 'ves', replace: 'f' },     // wolves → wolf
    { suffix: 'ves', replace: 'fe' },    // knives → knife
    { suffix: 'ies', replace: 'y' },     // babies → baby
    { suffix: 'es', replace: '' },      // watches → watch
    { suffix: 's', replace: '' }         // books → book
  ]

  // 常见的动词后缀
  const verbSuffixes = [
    { suffix: 'ied', replace: 'y' },     // cried → cry
    { suffix: 'ies', replace: 'y' },     // tries → try
    { suffix: 'ing', replace: 'e' },     // making → make
    { suffix: 'ing', replace: '' },      // eating → eat
    { suffix: 'ed', replace: 'e' },      // baked → bake
    { suffix: 'ed', replace: '' },       // played → play
    { suffix: 'es', replace: '' },       // goes → go
  ]

  // 尝试复数还原
  for (const { suffix, replace } of pluralSuffixes) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      const lemma = word.slice(0, -suffix.length) + replace
      return lemma
    }
  }

  // 尝试动词还原
  for (const { suffix, replace } of verbSuffixes) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      const lemma = word.slice(0, -suffix.length) + replace
      return lemma
    }
  }

  // 双写辅音结尾（如 running → run）
  if (word.length > 5 && word.match(/([a-z])\1ing$/)) {
    const lemma = word.slice(0, -4) // 去掉 'ing'
    if (lemma.length > 2) {
      return lemma
    }
  }

  // ly 结尾的副词转形容词
  if (word.endsWith('ly') && word.length > 4) {
    const lemma = word.slice(0, -2)
    if (lemma.length > 2) {
      return lemma
    }
  }

  // er 结尾转动词
  if (word.endsWith('er') && word.length > 4) {
    const lemma = word.slice(0, -2)
    if (lemma.length > 2) {
      return lemma
    }
  }

  return null
}

/**
 * 获取单词的原形（支持多级还原）
 */
function getWordLemma(word: string): string | null {
  let currentWord = word
  let maxIterations = 3 // 最多还原3次

  for (let i = 0; i < maxIterations; i++) {
    const lemma = getLemma(currentWord)
    if (!lemma) {
      break
    }
    currentWord = lemma
  }

  return currentWord !== word ? currentWord : null
}

/**
 * 激进的词形还原（处理更复杂的情况）
 * 如：concealer → conceal, teacher → teach, runner → run
 */
function getAggressiveLemma(word: string): string | null {
  // -er 结尾的词，可能是动词+er（表示动作执行者）
  if (word.endsWith('er') && word.length > 5) {
    const base = word.slice(0, -2)
    // 如果以双写辅音+er结尾（如 runner）
    if (base.length > 3 && base[base.length - 1] === base[base.length - 2]) {
      return base.slice(0, -1) // runner → run
    }
    // 否则直接去掉er（如 concealer → conceal）
    return base
  }

  // -or 结尾的词（比较级）
  if (word.endsWith('or') && word.length > 5) {
    return word.slice(0, -2)
  }

  // -est 结尾的词（最高级）
  if (word.endsWith('est') && word.length > 6) {
    return word.slice(0, -3)
  }

  // -ness 结尾（形容词转名词）
  if (word.endsWith('ness') && word.length > 6) {
    return word.slice(0, -4)
  }

  // -ment 结尾
  if (word.endsWith('ment') && word.length > 6) {
    return word.slice(0, -4)
  }

  // -tion 结尾
  if (word.endsWith('tion') && word.length > 6) {
    return word.slice(0, -4) + 'e'
  }

  // -able 结尾
  if (word.endsWith('able') && word.length > 6) {
    return word.slice(0, -4)
  }

  // -ive 结尾
  if (word.endsWith('ive') && word.length > 6) {
    return word.slice(0, -3) + 'e'
  }

  // -al 结尾
  if (word.endsWith('al') && word.length > 5) {
    return word.slice(0, -2)
  }

  return null
}

/**
 * 带超时的fetch
 */
async function fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * 从xxapi.cn获取单词定义（免费，无需认证，提供完整信息）
 * 返回：音标、例句、近义词、短语、翻译等
 */
async function lookupWordFromXXAPI(word: string): Promise<DictionaryEntry | null> {
  try {
    const response = await fetchWithTimeout(
      `https://v2.xxapi.cn/api/englishwords?word=${encodeURIComponent(word)}`,
      5000 // 5秒超时
    )

    if (!response.ok) {
      return null
    }

    const result = await response.json()

    // 检查响应格式
    if (!result || result.code !== 200 || !result.data) {
      return null
    }

    const data = result.data

    // 解析meanings - 从translations数组构建
    const meanings = data.translations?.map((trans: any) => {
      // 找到该词性的近义词
      const synonymData = data.synonyms?.find((s: any) => s.pos === trans.pos)
      const synonyms = synonymData?.Hwds?.map((h: any) => h.word) || []

      // 为每个词性创建定义，包含例句和翻译
      const definitions = [{
        definition: trans.tran_cn,
        example: undefined,
        exampleTranslation: undefined
      }]

      return {
        partOfSpeech: trans.pos,
        definitions,
        synonyms: synonyms,
        antonyms: [] // xxapi.cn不提供反义词
      }
    }) || []

    // 解析例句 - 为每个词性添加例句
    if (data.sentences && data.sentences.length > 0) {
      let sentenceIndex = 0

      // 为每个词性添加例句（最多3个）
      for (const meaning of meanings) {
        for (let defIndex = 0; defIndex < Math.min(3, data.sentences.length); defIndex++) {
          if (sentenceIndex >= data.sentences.length) break

          const sentence = data.sentences[sentenceIndex]

          // 如果是第一个词性的第一个定义，使用第一个例句
          if (defIndex === 0 && meaning.definitions[0]) {
            meaning.definitions[0].example = sentence.s_content
            meaning.definitions[0].exampleTranslation = sentence.s_cn
          } else {
            // 添加额外的定义（例句）
            meaning.definitions.push({
              definition: '',
              example: sentence.s_content,
              exampleTranslation: sentence.s_cn
            })
          }

          sentenceIndex++
        }

        if (sentenceIndex >= data.sentences.length) break
      }
    }

    // 解析短语/搭配词 - 限制为4个
    const collocations = data.phrases?.slice(0, 4).map((p: any) => p.p_content) || []

    return {
      word: data.word,
      phonetic: data.usphone || data.ukphone,
      usPhonetic: data.usphone,
      ukPhonetic: data.ukphone,
      audio: data.usspeech || data.ukspeech,
      meanings,
      collocations
    }
  } catch (error) {
    console.error('xxapi.cn API失败:', word, error)
    return null
  }
}

/**
 * 解析词典API返回的数据
 */
function parseDictionaryEntry(data: any, word: string): DictionaryEntry | null {
  try {
    const entry = data[0]
    if (!entry) return null

    // 提取美音和英音音标
    let usPhonetic: string | undefined
    let ukPhonetic: string | undefined
    let usAudio: string | undefined
    let ukAudio: string | undefined

    const genericPhonetic = entry.phonetic || entry.phonetics?.find((p: any) => p.text)?.text

    if (entry.phonetics && Array.isArray(entry.phonetics)) {
      for (const phonetic of entry.phonetics) {
        if (!phonetic.text) continue

        const audioUrl = phonetic.audio

        if (audioUrl) {
          if (audioUrl.includes('-us.mp3') || audioUrl.includes('/us/')) {
            if (!usPhonetic) usPhonetic = phonetic.text
            usAudio = audioUrl
          } else if (audioUrl.includes('-uk.mp3') || audioUrl.includes('/uk/')) {
            if (!ukPhonetic) ukPhonetic = phonetic.text
            ukAudio = audioUrl
          }
        }
      }

      if (!usPhonetic && !ukPhonetic) {
        const firstPhonetic = entry.phonetics.find((p: any) => p.text)?.text
        usPhonetic = firstPhonetic
        ukPhonetic = firstPhonetic
      }

      if (usPhonetic && !ukPhonetic) {
        ukPhonetic = usPhonetic
      } else if (ukPhonetic && !usPhonetic) {
        usPhonetic = ukPhonetic
      }
    }

    // 处理 meanings
    const meanings = entry.meanings?.map((m: any) => {
      return {
        partOfSpeech: m.partOfSpeech,
        definitions: m.definitions.slice(0, 5).map((d: any) => ({
          definition: d.definition,
          example: d.example,
          synonyms: d.synonyms?.slice(0, 5) || [],
          antonyms: d.antonyms?.slice(0, 5) || []
        })),
        synonyms: m.synonyms?.slice(0, 8) || [],
        antonyms: m.antonyms?.slice(0, 8) || []
      }
    }) || []

    // 生成常用搭配词
    const collocations = generateCollocations(entry.word, meanings)

    return {
      word: entry.word,
      phonetic: genericPhonetic,
      usPhonetic: usPhonetic || genericPhonetic,
      ukPhonetic: ukPhonetic || genericPhonetic,
      audio: usAudio || ukAudio || entry.phonetics?.find((p: any) => p.audio)?.audio,
      meanings,
      collocations
    }
  } catch (error) {
    console.error('解析词典数据失败:', error)
    return null
  }
}

/**
 * 从金山词霸API获取单词定义（免费，无需认证）
 * 只用于获取中文释义
 */
async function lookupWordFromIciba(word: string): Promise<{ translation: string; means: any[] } | null> {
  try {
    const response = await fetchWithTimeout(
      `https://dict-mobile.iciba.com/interface/index.php?c=word&m=getsuggest&word=${encodeURIComponent(word)}&nums=1&is_need_mean=1`,
      2000 // 更短的超时时间
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    // 检查返回的数据格式
    // 实际返回格式: {"message":[{"key":"hello","paraphrase":"...","means":[...]}],"status":1}
    if (!data || data.status !== 1 || !data.message || data.message.length === 0) {
      return null
    }

    const wordData = data.message[0]
    if (!wordData) return null

    return {
      translation: wordData.paraphrase || '',
      means: wordData.means || []
    }
  } catch (error) {
    console.error('金山词霸API失败:', error)
    return null
  }
}

/**
 * 从 DictionaryAPI.dev 获取单词定义
 * 增强版：获取更完整的音标、例句、近义词、反义词等数据
 * 优化：添加缓存和超时控制，优先使用DictionaryAPI.dev获取完整信息
 */
export async function lookupWord(word: string): Promise<DictionaryEntry | null> {
  if (!word) return null
  const normalizedWord = word.toLowerCase().trim()

  // 检查不存在的单词缓存
  if (notFoundCache.has(normalizedWord)) {
    return null
  }

  // 检查缓存
  const cached = wordCache.get(normalizedWord)
  if (cached) {
    return cached
  }

  // 优先使用 xxapi.cn 获取完整信息（音标、例句、近义词、短语等）
  // 这个API是免费的，无需认证，且应该在国内网络环境下可访问
  let result = await lookupWordFromXXAPI(normalizedWord)

  // 如果找不到，尝试词形还原（复数→单数，过去式→原形等）
  if (!result) {
    const lemma = getWordLemma(normalizedWord)
    if (lemma && lemma !== normalizedWord) {
      console.log(`词形还原: ${normalizedWord} → ${lemma}`)
      result = await lookupWordFromXXAPI(lemma)

      // 如果找到原形，将单词名替换为原形
      if (result) {
        result.word = normalizedWord // 保持用户输入的形式作为显示
      }
    }
  }

  // 如果还原后还是找不到，尝试更激进的还原（如 -er 结尾）
  if (!result) {
    const aggressiveLemma = getAggressiveLemma(normalizedWord)
    if (aggressiveLemma && aggressiveLemma !== normalizedWord) {
      console.log(`激进还原: ${normalizedWord} → ${aggressiveLemma}`)
      result = await lookupWordFromXXAPI(aggressiveLemma)

      if (result) {
        result.word = normalizedWord
      }
    }
  }

  // 如果xxapi.cn失败，尝试 DictionaryAPI.dev
  if (!result) {
    result = await lookupWordFromDictionaryAPI(normalizedWord)

    // DictionaryAPI.dev 成功但缺少中文翻译，从金山词霸补充
    if (result) {
      const icibaData = await lookupWordFromIciba(normalizedWord)
      if (icibaData) {
        // 合并中文翻译到现有释义中
        result.meanings.forEach(meaning => {
          // 为每个定义添加中文释义（如果有）
          if (meaning.definitions[0] && icibaData.translation) {
            const currentDef = meaning.definitions[0].definition || ''
            // 如果当前定义是英文或"No definition found"，添加中文
            if (!currentDef.includes('暂无') && currentDef !== 'No definition found') {
              // 英文释义存在，在前面添加中文
              meaning.definitions[0].definition = `${icibaData.translation} | ${currentDef}`
            } else {
              // 只有中文
              meaning.definitions[0].definition = icibaData.translation
            }
          }
        })
      }
    }
  }

  // 如果DictionaryAPI.dev也失败，尝试从金山词霸获取中文释义作为补充
  if (!result) {
    const icibaData = await lookupWordFromIciba(normalizedWord)
    if (icibaData) {
      // 使用金山词霸的中文释义创建基础条目
      const meanings: any[] = []

      if (icibaData.means && Array.isArray(icibaData.means)) {
        for (const part of icibaData.means) {
          const definitions = part.means.map((mean: string) => ({
            definition: mean,
            example: undefined
          }))

          meanings.push({
            partOfSpeech: part.part || 'unknown',
            definitions,
            synonyms: [],
            antonyms: []
          })
        }
      }

      // 如果没有找到释义，使用paraphrase
      if (meanings.length === 0 && icibaData.translation) {
        meanings.push({
          partOfSpeech: 'unknown',
          definitions: [{
            definition: icibaData.translation,
            example: undefined
          }],
          synonyms: [],
          antonyms: []
        })
      }

      result = {
        word: normalizedWord,
        meanings
      }
    }
  }

  // 最后的备选方案：如果仍然没有音标，尝试使用免费的音标API
  if (result && (!result.usPhonetic && !result.ukPhonetic && !result.phonetic)) {
    try {
      // 使用 wordsapi 获取音标（不需要认证，有免费额度）
      const phoneticResponse = await fetchWithTimeout(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${normalizedWord}`,
        3000
      )
      if (phoneticResponse.ok) {
        const phoneticData = await phoneticResponse.json()
        if (phoneticData && phoneticData[0]) {
          const entry = phoneticData[0]
          result.phonetic = entry.phonetic || entry.phonetics?.find((p: any) => p.text)?.text
          result.usPhonetic = result.phonetic
          result.ukPhonetic = result.phonetic
        }
      }
    } catch (error) {
      // 忽略音标API错误，至少我们有了释义
      console.log('获取音标失败，忽略:', normalizedWord)
    }
  }

  if (result) {
    // 缓存结果
    wordCache.set(normalizedWord, result)
    return result
  }

  // 当所有API都失败时，返回一个基本的词典条目作为回退
  // 这样至少可以显示单词和翻译
  const fallbackEntry: DictionaryEntry = {
    word: word,
    meanings: [{
      partOfSpeech: 'unknown',
      definitions: [{
        definition: '暂无详细释义，请查看中文翻译',
        example: undefined
      }]
    }]
  }

  // 标记为临时条目，不缓存（因为可能会成功）
  return fallbackEntry
}

/**
 * 从 DictionaryAPI.dev 获取完整单词信息
 */
async function lookupWordFromDictionaryAPI(word: string): Promise<DictionaryEntry | null> {
  try {
    const response = await fetchWithTimeout(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      5000 // 5秒超时
    )

    if (!response.ok) {
      // 缓存404结果
      if (response.status === 404) {
        notFoundCache.add(word)
      }
      return null
    }

    const data = await response.json()
    const entry = data[0]

    // 提取美音和英音音标 - 改进逻辑
    let usPhonetic: string | undefined
    let ukPhonetic: string | undefined
    let usAudio: string | undefined
    let ukAudio: string | undefined

    // 通用音标
    const genericPhonetic = entry.phonetic || entry.phonetics?.find((p: any) => p.text)?.text

    if (entry.phonetics && Array.isArray(entry.phonetics)) {
      for (const phonetic of entry.phonetics) {
        if (!phonetic.text) continue

        const audioUrl = phonetic.audio

        // 通过audio URL判断是美音还是英音
        if (audioUrl) {
          if (audioUrl.includes('-us.mp3') || audioUrl.includes('/us/')) {
            if (!usPhonetic) usPhonetic = phonetic.text
            usAudio = audioUrl
          } else if (audioUrl.includes('-uk.mp3') || audioUrl.includes('/uk/')) {
            if (!ukPhonetic) ukPhonetic = phonetic.text
            ukAudio = audioUrl
          }
        }
      }

      // 如果没有通过audio区分，尝试使用第一个可用的音标
      if (!usPhonetic && !ukPhonetic) {
        const firstPhonetic = entry.phonetics.find((p: any) => p.text)?.text
        usPhonetic = firstPhonetic
        ukPhonetic = firstPhonetic
      }

      // 只有一个音标时，尝试分配给美音
      if (usPhonetic && !ukPhonetic) {
        ukPhonetic = usPhonetic
      } else if (ukPhonetic && !usPhonetic) {
        usPhonetic = ukPhonetic
      }
    }

    // 收集所有词性的近义词和反义词（去重）
    const allSynonyms = new Set<string>()
    const allAntonyms = new Set<string>()

    // 处理 meanings
    const meanings = entry.meanings?.map((m: any) => {
      // 收集该词性的近义词和反义词
      if (m.synonyms) {
        m.synonyms.slice(0, 8).forEach((s: string) => allSynonyms.add(s))
      }
      if (m.antonyms) {
        m.antonyms.slice(0, 8).forEach((a: string) => allAntonyms.add(a))
      }

      return {
        partOfSpeech: m.partOfSpeech,
        definitions: m.definitions.slice(0, 5).map((d: any) => ({
          definition: d.definition,
          example: d.example,
          // 保留该定义的近义词和反义词
          synonyms: d.synonyms?.slice(0, 5) || [],
          antonyms: d.antonyms?.slice(0, 5) || []
        })),
        synonyms: m.synonyms?.slice(0, 8) || [],
        antonyms: m.antonyms?.slice(0, 8) || []
      }
    }) || []

    // 生成常用搭配词（基于词性和词根的简单规则）
    const collocations = generateCollocations(entry.word, meanings)

    return {
      word: entry.word,
      phonetic: genericPhonetic,
      usPhonetic: usPhonetic || genericPhonetic,
      ukPhonetic: ukPhonetic || genericPhonetic,
      audio: usAudio || ukAudio || entry.phonetics?.find((p: any) => p.audio)?.audio,
      meanings,
      collocations
    }
  } catch (error) {
    console.error('DictionaryAPI.dev 失败:', word, error)
    return null
  }
}

/**
 * 生成常用搭配词
 * 基于词性和单词特征生成常见的搭配词
 */
function generateCollocations(word: string, meanings: any[]): string[] {
  if (!word) return []
  const collocations: string[] = []
  const lowerWord = word.toLowerCase()

  // 常见动词搭配模式
  const verbPatterns = [
    `make ${word}`,
    `have ${word}`,
    `do ${word}`,
    `take ${word}`,
    `get ${word}`,
    `give ${word}`,
    `go ${word}`,
    `keep ${word}`,
    `a ${word}`,
    `the ${word}`,
    `${word} up`,
    `${word} out`,
    `${word} on`,
    `${word} off`,
    `be ${word}ed`,
    `become ${word}ed`,
    `very ${word}`,
    `really ${word}`,
    `quite ${word}`,
    `too ${word}`
  ]

  // 根据词性添加合理的搭配
  for (const meaning of meanings) {
    if (!meaning.partOfSpeech) continue
    const pos = meaning.partOfSpeech.toLowerCase()

    // 名词搭配
    if (pos.includes('noun') || pos.includes('n.')) {
      collocations.push(`a ${word}`, `the ${word}`, `have ${word}`, `make ${word}`)
    }
    // 动词搭配
    else if (pos.includes('verb') || pos.includes('v.')) {
      collocations.push(`${word} up`, `${word} out`, `to ${word}`, `will ${word}`)
    }
    // 形容词搭配
    else if (pos.includes('adjective') || pos.includes('adj') || pos.includes('a.')) {
      collocations.push(`very ${word}`, `really ${word}`, `a ${word}`, `be ${word}`)
    }
    // 副词搭配
    else if (pos.includes('adverb') || pos.includes('adv')) {
      collocations.push(`very ${word}`, `quite ${word}`)
    }

    // 只取前几个，避免过多
    if (collocations.length >= 8) break
  }

  // 去重并返回
  return Array.from(new Set(collocations)).slice(0, 8)
}

/**
 * 使用 Web Speech API 发音
 */
export function speakWord(word: string, lang: string = 'en-US'): void {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = lang
    utterance.rate = 0.8
    speechSynthesis.speak(utterance)
  }
}

/**
 * 简单的词性到颜色的映射
 */
export function getPartOfSpeechColor(partOfSpeech: string): string {
  const colors: Record<string, string> = {
    noun: '#3B82F6', // 蓝色
    verb: '#F97316', // 橙色
    adjective: '#22C55E', // 绿色
    adverb: '#A855F7', // 紫色
    pronoun: '#EC4899',
    preposition: '#14B8A6',
    conjunction: '#F59E0B',
    interjection: '#EF4444'
  }

  const pos = partOfSpeech.toLowerCase()
  for (const [key, color] of Object.entries(colors)) {
    if (pos.includes(key)) {
      return color
    }
  }

  return '#6B7280' // 默认灰色
}

/**
 * 解析句子中的单词
 */
export function parseWordsFromSentence(sentence: string): Array<{
  word: string
  start: number
  end: number
}> {
  // 匹配英文单词（包括连字符和撇号）
  const wordRegex = /[a-zA-Z]+(?:['-][a-zA-Z]+)*/g
  const words: Array<{ word: string; start: number; end: number }> = []
  let match

  while ((match = wordRegex.exec(sentence)) !== null) {
    words.push({
      word: match[0],
      start: match.index,
      end: match.index + match[0].length
    })
  }

  return words
}
