// 常用动词短语（Phrasal Verbs）列表
export const PHRASAL_VERBS: Record<string, {
  translation: string
  examples: Array<{
    en: string
    zh: string
  }>
}> = {
  'figure out': {
    translation: '弄清楚、理解、解决',
    examples: [
      { en: "I can't figure out how to use this machine.", zh: '我弄不清楚怎么使用这台机器。' },
      { en: "We need to figure out a solution.", zh: '我们需要找出一个解决方案。' }
    ]
  },
  'give up': {
    translation: '放弃',
    examples: [
      { en: "Don't give up on your dreams.", zh: '不要放弃你的梦想。' },
      { en: "She gave up smoking.", zh: '她戒烟了。' }
    ]
  },
  'break down': {
    translation: '分解、（机器）故障、（情绪）失控',
    examples: [
      { en: "The car broke down on the highway.", zh: '汽车在高速公路上抛锚了。' },
      { en: "Let's break down this problem.", zh: '让我们来分解这个问题。' }
    ]
  },
  'call off': {
    translation: '取消',
    examples: [
      { en: "They called off the meeting.", zh: '他们取消了会议。' },
      { en: "The game was called off due to rain.", zh: '由于下雨，比赛取消了。' }
    ]
  },
  'carry on': {
    translation: '继续、坚持',
    examples: [
      { en: "Carry on with your work.", zh: '继续你的工作。' },
      { en: "He carried on talking.", zh: '他继续说话。' }
    ]
  },
  'come up': {
    translation: '出现、发生、被提出',
    examples: [
      { en: "A new opportunity came up.", zh: '出现了一个新机会。' },
      { en: "The topic came up in the meeting.", zh: '会议上提到了这个话题。' }
    ]
  },
  'do away with': {
    translation: '废除、摆脱',
    examples: [
      { en: "We should do away with these rules.", zh: '我们应该废除这些规则。' },
      { en: "They did away with the old system.", zh: '他们废除了旧制度。' }
    ]
  },
  'get along': {
    translation: '相处融洽、进展',
    examples: [
      { en: "We get along well with our neighbors.", zh: '我们和邻居相处得很好。' },
      { en: "How are you getting along with your project?", zh: '你的项目进展如何？' }
    ]
  },
  'get over': {
    translation: '克服、从（疾病、打击）中恢复',
    examples: [
      { en: "She finally got over her ex-boyfriend.", zh: '她终于从失恋中走出来了。' },
      { en: "It took him a week to get over the flu.", zh: '他花了一周才从流感中恢复。' }
    ]
  },
  'look after': {
    translation: '照顾、照料',
    examples: [
      { en: "Can you look after my cat?", zh: '你能帮我照顾我的猫吗？' },
      { en: "Who will look after the children?", zh: '谁会照顾这些孩子？' }
    ]
  },
  'look forward to': {
    translation: '期待、盼望',
    examples: [
      { en: "I look forward to seeing you again.", zh: '我期待再次见到你。' },
      { en: "We look forward to your reply.", zh: '我们期待您的回复。' }
    ]
  },
  'look up': {
    translation: '查阅、仰望、改善',
    examples: [
      { en: "Look up the word in the dictionary.", zh: '在字典里查这个词。' },
      { en: "Things are looking up.", zh: '情况正在好转。' }
    ]
  },
  'make up': {
    translation: '编造、和好、化妆、弥补',
    examples: [
      { en: "She made up a story.", zh: '她编了一个故事。' },
      { en: "They kissed and made up.", zh: '他们亲吻后和好了。' }
    ]
  },
  'put off': {
    translation: '推迟、延后',
    examples: [
      { en: "We had to put off the trip.", zh: '我们不得不推迟旅行。' },
      { en: "Don't put off until tomorrow what you can do today.", zh: '今日事今日毕。' }
    ]
  },
  'run out of': {
    translation: '用完、耗尽',
    examples: [
      { en: "We ran out of milk.", zh: '我们的牛奶用完了。' },
      { en: "I'm running out of patience.", zh: '我的耐心快耗尽了。' }
    ]
  },
  'set up': {
    translation: '建立、安排、设置',
    examples: [
      { en: "They set up a new company.", zh: '他们建立了一家新公司。' },
      { en: "Can you help me set up the computer?", zh: '你能帮我设置电脑吗？' }
    ]
  },
  'take after': {
    translation: '与（父母）相像',
    examples: [
      { en: "She takes after her mother.", zh: '她长得像她妈妈。' },
      { en: "He takes after his father in personality.", zh: '他在性格上像他父亲。' }
    ]
  },
  'turn down': {
    translation: '拒绝、调低',
    examples: [
      { en: "He turned down the job offer.", zh: '他拒绝了这份工作。' },
      { en: "Can you turn down the music?", zh: '你能把音乐调低点吗？' }
    ]
  },
  'work out': {
    translation: '锻炼、解决、计算出',
    examples: [
      { en: "I work out every morning.", zh: '我每天早上锻炼。' },
      { en: "Let's work out a solution.", zh: '让我们想出一个解决方案。' }
    ]
  },
  'bring up': {
    translation: '抚养、提出',
    examples: [
      { en: "She was brought up by her grandmother.", zh: '她是祖母带大的。' },
      { en: "Don't bring up that topic again.", zh: '别再提那个话题了。' }
    ]
  },
  'end up': {
    translation: '最终、结果',
    examples: [
      { en: "We ended up eating at home.", zh: '我们最后在家吃了。' },
      { en: "If you keep procrastinating, you'll end up failing.", zh: '如果你继续拖延，最终会失败。' }
    ]
  },
  'fill out': {
    translation: '填写',
    examples: [
      { en: "Please fill out this form.", zh: '请填写这张表格。' },
      { en: "I need to fill out an application.", zh: '我需要填写申请表。' }
    ]
  },
  'find out': {
    translation: '发现、查明',
    examples: [
      { en: "I found out the truth.", zh: '我发现了真相。' },
      { en: "We'll find out soon enough.", zh: '我们很快就会查明的。' }
    ]
  },
  'go on': {
    translation: '继续',
    examples: [
      { en: "Please go on with your story.", zh: '请继续讲你的故事。' },
      { en: "The show must go on.", zh: '演出必须继续。' }
    ]
  },
  'hold on': {
    translation: '稍等、坚持',
    examples: [
      { en: "Hold on a second.", zh: '请稍等一下。' },
      { en: "Hold on tight!", zh: '抓紧了！' }
    ]
  },
  'keep on': {
    translation: '继续（做某事）',
    examples: [
      { en: "Keep on trying!", zh: '继续尝试！' },
      { en: "He kept on working late.", zh: '他继续工作到很晚。' }
    ]
  },
  'let go': {
    translation: '放手、放弃',
    examples: [
      { en: "Let go of the handle.", zh: '放开把手。' },
      { en: "You need to let go of the past.", zh: '你需要放下过去。' }
    ]
  },
  'pass away': {
    translation: '去世（委婉语）',
    examples: [
      { en: "His grandfather passed away last year.", zh: '他祖父去年去世了。' },
      { en: "I'm sorry to hear that she passed away.", zh: '听说她去世了我很难过。' }
    ]
  },
  'pull through': {
    translation: '度过难关、恢复',
    examples: [
      { en: "She pulled through the illness.", zh: '她从疾病中恢复了。' },
      { en: "We'll pull through this together.", zh: '我们会一起度过这个难关。' }
    ]
  },
  'show up': {
    translation: '出现、露面',
    examples: [
      { en: "He didn't show up at the party.", zh: '他没有在聚会上露面。' },
      { en: "Thanks for showing up.", zh: '谢谢你来了。' }
    ]
  },
  'take off': {
    translation: '脱下、起飞、成功',
    examples: [
      { en: "Take off your coat.", zh: '脱下你的外套。' },
      { en: "The plane will take off soon.", zh: '飞机很快就要起飞了。' }
    ]
  },
  'try on': {
    translation: '试穿',
    examples: [
      { en: "Can I try on this shirt?", zh: '我可以试穿这件衬衫吗？' },
      { en: "She tried on several dresses.", zh: '她试穿了好几条裙子。' }
    ]
  }
}

// 获取短语信息
export function getPhraseInfo(phrase: string) {
  if (!phrase) return null
  const normalizedPhrase = phrase.toLowerCase().trim()
  return PHRASAL_VERBS[normalizedPhrase] || null
}

// 检查文本中是否包含任何短语
export function findPhrasesInText(text: string): Array<{
  phrase: string
  start: number
  end: number
  info: typeof PHRASAL_VERBS[keyof typeof PHRASAL_VERBS]
}> {
  const results: Array<{
    phrase: string
    start: number
    end: number
    info: typeof PHRASAL_VERBS[keyof typeof PHRASAL_VERBS]
  }> = []

  if (!text) return results

  const lowerText = text.toLowerCase()

  for (const [phrase, info] of Object.entries(PHRASAL_VERBS)) {
    const regex = new RegExp(phrase.replace(/\s+/g, '\\s+'), 'gi')
    let match

    while ((match = regex.exec(lowerText)) !== null) {
      results.push({
        phrase,
        start: match.index,
        end: match.index + match[0].length,
        info
      })
    }
  }

  // 按起始位置排序并去重
  results.sort((a, b) => a.start - b.start)

  return results
}
