/**
 * 自动分析英语学习视频的难度级别
 * 基于 CEFR 标准：A1, A2, B1, B2, C1, C2
 */

export interface SubtitleSegment {
  startTime: number
  endTime: number
  text: string | { en: string; zh: string }
}

export interface DifficultyScore {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  confidence: number // 0-1，置信度
  details: {
    vocabularyScore: number
    sentenceScore: number
    speedScore: number
    durationScore: number
  }
}

// 常见简单词汇（A1-A2级别）
const SIMPLE_WORDS = new Set([
  // 基础代词和冠词
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'this', 'that', 'these', 'those', 'a', 'an', 'the',
  // 基础动词
  'be', 'am', 'is', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'doing', 'go', 'goes', 'went', 'gone', 'going', 'get', 'gets', 'got', 'getting',
  'make', 'makes', 'made', 'making', 'know', 'knows', 'knew', 'known', 'knowing', 'think', 'thinks',
  'thought', 'thinking', 'take', 'takes', 'took', 'taken', 'taking', 'come', 'comes', 'came', 'coming',
  'want', 'wants', 'wanting', 'look', 'looks', 'looking', 'use', 'uses', 'using', 'find', 'finds',
  'found', 'finding', 'give', 'gives', 'gave', 'given', 'giving', 'tell', 'tells', 'told', 'telling',
  'work', 'works', 'working', 'call', 'calls', 'calling', 'try', 'tries', 'tried', 'trying', 'ask',
  'asks', 'asking', 'need', 'needs', 'needing', 'feel', 'feels', 'feeling', 'become', 'becomes',
  'became', 'becoming', 'leave', 'leaves', 'leaving', 'put', 'puts', 'putting', 'mean', 'means',
  'meant', 'meaning', 'keep', 'keeps', 'keeping', 'let', 'lets', 'letting', 'begin', 'begins',
  'began', 'begun', 'beginning', 'seem', 'seems', 'seemed', 'seeming', 'help', 'helps', 'helping',
  'talk', 'talks', 'talking', 'turn', 'turns', 'turned', 'turning', 'start', 'starts', 'starting',
  'show', 'shows', 'showed', 'showing', 'hear', 'hears', 'heard', 'hearing', 'play', 'plays', 'playing',
  'run', 'runs', 'running', 'move', 'moves', 'moving', 'like', 'likes', 'liking', 'live', 'lives',
  'lived', 'living', 'believe', 'believes', 'believed', 'believing', 'hold', 'holds', 'holding',
  'bring', 'brings', 'brought', 'bringing', 'happen', 'happens', 'happening', 'write', 'writes',
  'wrote', 'written', 'writing', 'sit', 'sits', 'sat', 'sitting', 'stand', 'stands', 'stood', 'standing',
  'lose', 'loses', 'lost', 'losing', 'pay', 'pays', 'paid', 'paying', 'meet', 'meets', 'met', 'meeting',
  'include', 'includes', 'including', 'continue', 'continues', 'continuing', 'set', 'sets', 'setting',
  'learn', 'learns', 'learned', 'learning', 'change', 'changes', 'changing', 'lead', 'leads', 'leading',
  'understand', 'understands', 'understood', 'understanding', 'watch', 'watches', 'watched', 'watching',
  'follow', 'follows', 'followed', 'following', 'stop', 'stops', 'stopped', 'stopping', 'create',
  'creates', 'creating', 'speak', 'speaks', 'spoke', 'spoken', 'speaking', 'read', 'reads', 'reading',
  'allow', 'allows', 'allowing', 'add', 'adds', 'adding', 'spend', 'spends', 'spent', 'spending',
  'grow', 'grows', 'grew', 'grown', 'growing', 'open', 'opens', 'opened', 'opening', 'walk', 'walks',
  'walking', 'win', 'wins', 'won', 'winning', 'offer', 'offers', 'offering', 'remember', 'remembers',
  'remembering', 'love', 'loves', 'loving', 'consider', 'considers', 'considering', 'appear', 'appears',
  'appearing', 'buy', 'buys', 'bought', 'buying', 'wait', 'waits', 'waiting', 'serve', 'serves', 'serving',
  'die', 'dies', 'died', 'dying', 'send', 'sends', 'sending', 'expect', 'expects', 'expecting', 'build',
  'builds', 'building', 'stay', 'stays', 'staying', 'fall', 'falls', 'fell', 'fallen', 'falling',
  'cut', 'cuts', 'cutting', 'reach', 'reaches', 'reaching', 'kill', 'kills', 'killing', 'remain',
  'remains', 'remaining',
  // 基础名词
  'time', 'year', 'people', 'way', 'day', 'man', 'woman', 'child', 'children', 'thing', 'world',
  'life', 'hand', 'part', 'place', 'case', 'week', 'company', 'system', 'program', 'question', 'work',
  'government', 'number', 'night', 'point', 'home', 'water', 'room', 'mother', 'area', 'money',
  'story', 'fact', 'month', 'lot', 'right', 'study', 'book', 'eye', 'job', 'word', 'business',
  'issue', 'side', 'kind', 'head', 'house', 'service', 'friend', 'father', 'power', 'hour', 'game',
  'line', 'end', 'member', 'law', 'car', 'city', 'community', 'name', 'president', 'team', 'minute',
  'idea', 'kid', 'body', 'information', 'back', 'parent', 'face', 'others', 'level', 'office', 'door',
  'health', 'person', 'art', 'war', 'history', 'party', 'result', 'change', 'morning', 'reason',
  'research', 'girl', 'guy', 'moment', 'air', 'teacher', 'force', 'education',
  // 基础形容词
  'good', 'new', 'first', 'last', 'long', 'great', 'little', 'own', 'other', 'old', 'right', 'big',
  'high', 'different', 'small', 'large', 'next', 'early', 'young', 'important', 'few', 'public',
  'bad', 'same', 'able', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'up', 'about',
  'into', 'over', 'after', 'beneath', 'under', 'above', 'the', 'also', 'then', 'so', 'no', 'yes', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'all',
  'more', 'some', 'these', 'their', 'your', 'our', 'both', 'what', 'which', 'who', 'whom', 'whose',
  'when', 'where', 'why', 'how', 'and', 'or', 'but', 'if', 'as', 'because', 'although', 'though', 'while',
  'since', 'until', 'before', 'after', 'during'
])

// 高级词汇（B2-C2级别）
const ADVANCED_WORDS = new Set([
  // 学术词汇
  'consequently', 'furthermore', 'nevertheless', 'nonetheless', 'moreover', 'therefore', 'thus',
  'hence', 'accordingly', 'whereby', 'wherein', 'whereas', 'albeit', 'notwithstanding',
  // 抽象概念
  'phenomenon', 'phenomena', 'paradigm', 'hypothesis', 'methodology', 'theoretical', 'conceptual',
  'abstract', 'concrete', 'inherent', 'intrinsic', 'extrinsic', 'ubiquitous', 'prevalent', 'manifest',
  // 复杂动词
  'articulate', 'exacerbate', 'ameliorate', 'substantiate', 'corroborate', 'delineate', 'elucidate',
  'explicate', 'implicate', 'complicate', 'simplify', 'exemplify', 'exemplify', 'typify', 'characterize',
  'distinguish', 'differentiate', 'discriminate', 'categorize', 'classify', 'analyze', 'synthesize',
  'evaluate', 'assess', 'estimate', 'approximate', 'determine', 'ascertain', 'establish', 'verify',
  // 复杂形容词
  'unprecedented', 'imperative', 'indispensable', 'incompatible', 'inconsistent', 'conspicuous',
  'prominent', 'salient', 'pertinent', 'relevant', 'irrelevant', 'appropriate', 'inappropriate',
  'adequate', 'inadequate', 'sufficient', 'insufficient', 'efficient', 'inefficient', 'effective',
  'ineffective', 'essential', 'nonessential', 'fundamental', 'rudimentary', 'elementary', 'advanced',
  'sophisticated', 'complex', 'complicated', 'intricate', 'convoluted',
  // 商业/政治词汇
  'infrastructure', 'superstructure', 'hierarchy', 'bureaucracy', 'administration', 'management',
  'organization', 'enterprise', 'initiative', 'undertaking', 'endeavor', 'enterprise', 'venture',
  'investment', 'expenditure', 'revenue', 'expenditure', 'allocation', 'distribution', 'redistribution',
  // 科技词汇
  'technological', 'innovation', 'revolutionary', 'evolutionary', 'cutting-edge', 'state-of-the-art',
  'experimental', 'hypothetical', 'theoretical', 'empirical', 'quantitative', 'qualitative',
  'statistical', 'probabilistic', 'computational', 'algorithmic', 'methodological'
])

/**
 * 分析视频难度
 */
export function analyzeDifficulty(
  subtitles: SubtitleSegment[],
  duration: number
): DifficultyScore {
  // 1. 词汇分析
  const vocabularyScore = analyzeVocabulary(subtitles)

  // 2. 句子复杂度分析
  const sentenceScore = analyzeSentences(subtitles)

  // 3. 语速分析
  const speedScore = analyzeSpeed(subtitles, duration)

  // 4. 时长分析（视频长度）
  const durationScore = analyzeDuration(duration)

  // 综合评分（加权平均）
  const weights = {
    vocabulary: 0.4,
    sentence: 0.25,
    speed: 0.2,
    duration: 0.15
  }

  const overallScore =
    vocabularyScore * weights.vocabulary +
    sentenceScore * weights.sentence +
    speedScore * weights.speed +
    durationScore * weights.duration

  // 转换为 CEFR 级别
  const level = scoreToLevel(overallScore)

  return {
    level,
    confidence: calculateConfidence(vocabularyScore, sentenceScore, speedScore),
    details: {
      vocabularyScore,
      sentenceScore,
      speedScore,
      durationScore
    }
  }
}

/**
 * 分析词汇难度（0-1，越高越难）
 */
function analyzeVocabulary(subtitles: SubtitleSegment[]): number {
  let totalWords = 0
  let simpleWordCount = 0
  let advancedWordCount = 0

  for (const subtitle of subtitles) {
    const text = typeof subtitle.text === 'string' ? subtitle.text : subtitle.text.en
    const words = text.toLowerCase().split(/\s+[^a-z]*/).filter(w => w.length > 0)

    totalWords += words.length

    for (const word of words) {
      const cleanWord = word.replace(/[.,!?;:"'()]/g, '')
      if (SIMPLE_WORDS.has(cleanWord)) {
        simpleWordCount++
      }
      if (ADVANCED_WORDS.has(cleanWord)) {
        advancedWordCount++
      }
    }
  }

  if (totalWords === 0) return 0.5

  // 简单词比例
  const simpleRatio = simpleWordCount / totalWords
  // 高级词比例
  const advancedRatio = advancedWordCount / totalWords

  // 评分：简单词越多越容易，高级词越多越难
  // 0-0.3: A1, 0.3-0.45: A2, 0.45-0.6: B1, 0.6-0.75: B2, 0.75-0.9: C1, 0.9-1: C2
  let score = 0.5

  // 简单词超过70%倾向于容易
  if (simpleRatio > 0.7) {
    score -= (simpleRatio - 0.7) * 0.5
  }

  // 高级词增加难度
  score += advancedRatio * 0.6

  return Math.max(0, Math.min(1, score))
}

/**
 * 分析句子复杂度（0-1，越高越难）
 */
function analyzeSentences(subtitles: SubtitleSegment[]): number {
  let totalSentences = 0
  let totalWords = 0
  let longSentences = 0
  let complexSentences = 0

  for (const subtitle of subtitles) {
    const text = typeof subtitle.text === 'string' ? subtitle.text : subtitle.text.en

    // 按句子分割
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    totalSentences += sentences.length

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/).filter(w => w.length > 0)
      totalWords += words.length

      // 长句子（超过15个词）
      if (words.length > 15) {
        longSentences++
      }

      // 复杂句型（包含从句标记）
      const lowerSentence = sentence.toLowerCase()
      const hasClause = /(?:which|that|who|whom|whose|where|when|why|how|if|whether|because|although|though|while|since|until|unless|before|after|during)/.test(lowerSentence)
      if (hasClause) {
        complexSentences++
      }
    }
  }

  if (totalSentences === 0) return 0.5

  const avgSentenceLength = totalWords / totalSentences
  const longSentenceRatio = longSentences / totalSentences
  const complexSentenceRatio = complexSentences / totalSentences

  // 评分：句子越长越难，复杂句越多越难
  let score = 0.5

  // 平均句长影响
  if (avgSentenceLength > 15) {
    score += (avgSentenceLength - 15) * 0.02
  } else if (avgSentenceLength < 8) {
    score -= (8 - avgSentenceLength) * 0.03
  }

  // 长句子比例
  score += longSentenceRatio * 0.15

  // 复杂句比例
  score += complexSentenceRatio * 0.2

  return Math.max(0, Math.min(1, score))
}

/**
 * 分析语速（0-1，越高越难）
 */
function analyzeSpeed(subtitles: SubtitleSegment[], duration: number): number {
  let totalWords = 0

  for (const subtitle of subtitles) {
    const text = typeof subtitle.text === 'string' ? subtitle.text : subtitle.text.en
    const words = text.split(/\s+/).filter(w => w.length > 0)
    totalWords += words.length
  }

  // 计算每分钟词数 (WPM)
  const wpm = duration > 0 ? (totalWords / duration) * 60 : 0

  // 评分：正常语速约130-150 WPM
  // < 100: 很慢(容易), 100-130: 慢, 130-150: 正常, 150-180: 快, > 180: 很快(难)
  let score = 0.5

  if (wpm < 100) {
    score -= (100 - wpm) * 0.005
  } else if (wpm > 150) {
    score += (wpm - 150) * 0.003
  }

  return Math.max(0, Math.min(1, score))
}

/**
 * 分析时长（0-1，越长越难）
 */
function analyzeDuration(duration: number): number {
  // 时长评分（秒）：
  // < 60: A1, 60-180: A2, 180-300: B1, 300-600: B2, 600-900: C1, > 900: C2
  if (duration < 60) return 0
  if (duration < 180) return 0.2
  if (duration < 300) return 0.4
  if (duration < 600) return 0.6
  if (duration < 900) return 0.8
  return 1
}

/**
 * 将分数转换为 CEFR 级别
 */
function scoreToLevel(score: number): 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' {
  if (score < 0.2) return 'A1'
  if (score < 0.35) return 'A2'
  if (score < 0.5) return 'B1'
  if (score < 0.7) return 'B2'
  if (score < 0.85) return 'C1'
  return 'C2'
}

/**
 * 计算置信度
 */
function calculateConfidence(
  vocabularyScore: number,
  sentenceScore: number,
  speedScore: number
): number {
  // 如果各项评分一致，置信度高；如果不一致，置信度低
  const scores = [vocabularyScore, sentenceScore, speedScore]
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length

  // 方差越小，置信度越高
  const confidence = Math.max(0, 1 - variance * 2)
  return Math.round(confidence * 100) / 100
}
