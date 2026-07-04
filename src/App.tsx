import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  CSSProperties,
  ChangeEvent,
  Dispatch,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  SetStateAction,
} from 'react'

type StellarisObsidianBridge = {
  loadSnapshot: () => Promise<string | null>
  saveSnapshot: (contents: string) => Promise<string>
  exportMigrationFile: (contents: string) => Promise<string>
  saveMarkdownFile: (payload: { filename: string; contents: string }) => Promise<string>
  savePdfFile: (payload: { filename: string; contentsBase64: string }) => Promise<string>
  openCanvasFile: (payload: { id: string; title: string; contents: string }) => Promise<string>
}

declare global {
  interface Window {
    StellarisObsidianBridge?: StellarisObsidianBridge
  }
}

type ProgressState = 'unbound' | 'draft' | 'lit'
type ViewMode =
  | 'galaxy'
  | 'editor'
  | 'notes'
  | 'whiteboards'
  | 'statistics'
  | 'calendar'
  | 'settings'
type ParagraphMode = 'zh' | 'en' | 'none'
type ThemeMode = 'auto' | 'day' | 'night'
type ActiveTheme = 'day' | 'night'
type Language = 'zh' | 'en'
type WhiteboardMode = 'select' | 'node' | 'connect' | 'draw' | 'erase'

type ConstellationStar = {
  id: string
  label: string
  x: number
  y: number
  magnitude: number
}

type StarConnection = {
  from: string
  to: string
}

type Zodiac = {
  id: string
  name: string
  latin: string
  symbol: string
  element: string
  stars: ConstellationStar[]
  connections: StarConnection[]
}

type WritingPiece = {
  id: string
  zodiacId: string
  starId: string
  title: string
  content: string
  target: number
  paragraphMode: ParagraphMode
  updatedAt: string
  anchors: StarAnchor[]
  dockLog: string
}

type WritingStats = {
  characters: number
  words: number
  effective: number
}

type StarAnchor = {
  id: string
  start: number
  end: number
  tag: string
  createdAt: string
}

type AppCopy = {
  leftSlogan: string
  quote: string
  author: string
}

type FontImport = {
  label: string
  family: string
  dataUrl?: string
  storageKey?: string
}

type FontSettings = {
  zhFont: string
  enFont: string
  zhImports: FontImport[]
  enImports: FontImport[]
}

type WhiteboardNode = {
  id: string
  x: number
  y: number
  text: string
}

type WhiteboardEdge = {
  id: string
  from: string
  to: string
  label: string
}

type WhiteboardStroke = {
  id: string
  points: Array<{ x: number; y: number }>
  color: string
  width: number
}

type WhiteboardImage = {
  id: string
  x: number
  y: number
  width: number
  height: number
  dataUrl: string
}

type Whiteboard = {
  id: string
  title: string
  updatedAt: string
  nodes: WhiteboardNode[]
  edges: WhiteboardEdge[]
  strokes: WhiteboardStroke[]
  images: WhiteboardImage[]
}

type AppSnapshot = {
  schemaVersion: 1
  savedAt: string
  pieces: Record<string, WritingPiece>
  whiteboards: Record<string, Whiteboard>
  appCopy: AppCopy
  themeMode: ThemeMode
  language: Language
}

const zodiacs: Zodiac[] = [
  {
    id: 'aries',
    name: '白羊座',
    latin: 'Aries',
    symbol: '♈',
    element: 'Fire',
    stars: [
      { id: 'hamal', label: 'Hamal', x: 23, y: 43, magnitude: 2 },
      { id: 'sheratan', label: 'Sheratan', x: 44, y: 51, magnitude: 2.6 },
      { id: 'mesarthim', label: 'Mesarthim', x: 58, y: 60, magnitude: 3.9 },
      { id: 'bharani', label: 'Bharani', x: 72, y: 39, magnitude: 4.3 },
    ],
    connections: [
      { from: 'hamal', to: 'sheratan' },
      { from: 'sheratan', to: 'mesarthim' },
      { from: 'sheratan', to: 'bharani' },
    ],
  },
  {
    id: 'taurus',
    name: '金牛座',
    latin: 'Taurus',
    symbol: '♉',
    element: 'Earth',
    stars: [
      { id: 'aldebaran', label: 'Aldebaran', x: 52, y: 55, magnitude: 0.9 },
      { id: 'elnath', label: 'Elnath', x: 77, y: 18, magnitude: 1.7 },
      { id: 'ain', label: 'Ain', x: 38, y: 48, magnitude: 3.5 },
      { id: 'theta1', label: 'Theta Tauri', x: 31, y: 61, magnitude: 3.8 },
      { id: 'zeta', label: 'Zeta Tauri', x: 75, y: 79, magnitude: 3 },
      { id: 'lambda', label: 'Lambda Tauri', x: 60, y: 38, magnitude: 3.4 },
    ],
    connections: [
      { from: 'elnath', to: 'lambda' },
      { from: 'lambda', to: 'aldebaran' },
      { from: 'aldebaran', to: 'ain' },
      { from: 'ain', to: 'theta1' },
      { from: 'aldebaran', to: 'zeta' },
    ],
  },
  {
    id: 'gemini',
    name: '双子座',
    latin: 'Gemini',
    symbol: '♊',
    element: 'Air',
    stars: [
      { id: 'castor', label: 'Castor', x: 30, y: 18, magnitude: 1.6 },
      { id: 'pollux', label: 'Pollux', x: 48, y: 24, magnitude: 1.1 },
      { id: 'alhena', label: 'Alhena', x: 66, y: 70, magnitude: 1.9 },
      { id: 'wasat', label: 'Wasat', x: 50, y: 52, magnitude: 3.5 },
      { id: 'mekbuda', label: 'Mekbuda', x: 37, y: 67, magnitude: 4 },
      { id: 'tejat', label: 'Tejat', x: 71, y: 42, magnitude: 2.9 },
    ],
    connections: [
      { from: 'castor', to: 'wasat' },
      { from: 'wasat', to: 'mekbuda' },
      { from: 'pollux', to: 'tejat' },
      { from: 'tejat', to: 'alhena' },
      { from: 'wasat', to: 'tejat' },
    ],
  },
  {
    id: 'cancer',
    name: '巨蟹座',
    latin: 'Cancer',
    symbol: '♋',
    element: 'Water',
    stars: [
      { id: 'acubens', label: 'Acubens', x: 40, y: 74, magnitude: 4.3 },
      { id: 'altarf', label: 'Altarf', x: 74, y: 67, magnitude: 3.5 },
      { id: 'asellus-n', label: 'Asellus Borealis', x: 44, y: 35, magnitude: 4.7 },
      { id: 'asellus-s', label: 'Asellus Australis', x: 53, y: 48, magnitude: 3.9 },
      { id: 'iota', label: 'Iota Cancri', x: 23, y: 24, magnitude: 4 },
    ],
    connections: [
      { from: 'iota', to: 'asellus-n' },
      { from: 'asellus-n', to: 'asellus-s' },
      { from: 'asellus-s', to: 'acubens' },
      { from: 'asellus-s', to: 'altarf' },
    ],
  },
  {
    id: 'leo',
    name: '狮子座',
    latin: 'Leo',
    symbol: '♌',
    element: 'Fire',
    stars: [
      { id: 'regulus', label: 'Regulus', x: 33, y: 70, magnitude: 1.4 },
      { id: 'denebola', label: 'Denebola', x: 79, y: 52, magnitude: 2.1 },
      { id: 'algieba', label: 'Algieba', x: 37, y: 37, magnitude: 2.2 },
      { id: 'zosma', label: 'Zosma', x: 63, y: 42, magnitude: 2.6 },
      { id: 'chertan', label: 'Chertan', x: 61, y: 61, magnitude: 3.3 },
      { id: 'rasalas', label: 'Rasalas', x: 27, y: 22, magnitude: 3.9 },
    ],
    connections: [
      { from: 'regulus', to: 'algieba' },
      { from: 'algieba', to: 'rasalas' },
      { from: 'regulus', to: 'chertan' },
      { from: 'chertan', to: 'zosma' },
      { from: 'zosma', to: 'denebola' },
      { from: 'chertan', to: 'denebola' },
    ],
  },
  {
    id: 'virgo',
    name: '处女座',
    latin: 'Virgo',
    symbol: '♍',
    element: 'Earth',
    stars: [
      { id: 'spica', label: 'Spica', x: 72, y: 78, magnitude: 1 },
      { id: 'zavijava', label: 'Zavijava', x: 21, y: 38, magnitude: 3.6 },
      { id: 'porrima', label: 'Porrima', x: 43, y: 52, magnitude: 2.7 },
      { id: 'vindemiatrix', label: 'Vindemiatrix', x: 62, y: 30, magnitude: 2.8 },
      { id: 'heze', label: 'Heze', x: 57, y: 68, magnitude: 3.4 },
    ],
    connections: [
      { from: 'zavijava', to: 'porrima' },
      { from: 'porrima', to: 'vindemiatrix' },
      { from: 'porrima', to: 'heze' },
      { from: 'heze', to: 'spica' },
    ],
  },
  {
    id: 'libra',
    name: '天秤座',
    latin: 'Libra',
    symbol: '♎',
    element: 'Air',
    stars: [
      { id: 'zubenes', label: 'Zubeneschamali', x: 34, y: 24, magnitude: 2.6 },
      { id: 'zubenel', label: 'Zubenelgenubi', x: 28, y: 64, magnitude: 2.8 },
      { id: 'brachium', label: 'Brachium', x: 70, y: 73, magnitude: 3.3 },
      { id: 'sigma', label: 'Sigma Librae', x: 72, y: 37, magnitude: 3.3 },
    ],
    connections: [
      { from: 'zubenes', to: 'zubenel' },
      { from: 'zubenes', to: 'sigma' },
      { from: 'zubenel', to: 'brachium' },
      { from: 'sigma', to: 'brachium' },
    ],
  },
  {
    id: 'scorpio',
    name: '天蝎座',
    latin: 'Scorpius',
    symbol: '♏',
    element: 'Water',
    stars: [
      { id: 'antares', label: 'Antares', x: 45, y: 42, magnitude: 1 },
      { id: 'acrabh', label: 'Acrab', x: 32, y: 24, magnitude: 2.6 },
      { id: 'dschubba', label: 'Dschubba', x: 42, y: 20, magnitude: 2.3 },
      { id: 'shaula', label: 'Shaula', x: 76, y: 76, magnitude: 1.6 },
      { id: 'sargas', label: 'Sargas', x: 64, y: 68, magnitude: 1.9 },
      { id: 'lesath', label: 'Lesath', x: 84, y: 67, magnitude: 2.7 },
      { id: 'wei', label: 'Wei', x: 52, y: 59, magnitude: 2.9 },
    ],
    connections: [
      { from: 'acrabh', to: 'dschubba' },
      { from: 'dschubba', to: 'antares' },
      { from: 'antares', to: 'wei' },
      { from: 'wei', to: 'sargas' },
      { from: 'sargas', to: 'shaula' },
      { from: 'shaula', to: 'lesath' },
    ],
  },
  {
    id: 'sagittarius',
    name: '射手座',
    latin: 'Sagittarius',
    symbol: '♐',
    element: 'Fire',
    stars: [
      { id: 'kaus-a', label: 'Kaus Australis', x: 50, y: 68, magnitude: 1.8 },
      { id: 'nunki', label: 'Nunki', x: 72, y: 42, magnitude: 2 },
      { id: 'ascella', label: 'Ascella', x: 36, y: 48, magnitude: 2.6 },
      { id: 'kaus-m', label: 'Kaus Media', x: 47, y: 43, magnitude: 2.7 },
      { id: 'kaus-b', label: 'Kaus Borealis', x: 55, y: 28, magnitude: 2.8 },
      { id: 'rukhbat', label: 'Rukbat', x: 26, y: 75, magnitude: 4 },
    ],
    connections: [
      { from: 'rukhbat', to: 'ascella' },
      { from: 'ascella', to: 'kaus-m' },
      { from: 'kaus-m', to: 'kaus-b' },
      { from: 'kaus-m', to: 'kaus-a' },
      { from: 'kaus-a', to: 'nunki' },
      { from: 'kaus-b', to: 'nunki' },
    ],
  },
  {
    id: 'capricorn',
    name: '摩羯座',
    latin: 'Capricornus',
    symbol: '♑',
    element: 'Earth',
    stars: [
      { id: 'dabih', label: 'Dabih', x: 28, y: 24, magnitude: 3.1 },
      { id: 'algiedi', label: 'Algedi', x: 20, y: 34, magnitude: 3.6 },
      { id: 'nashira', label: 'Nashira', x: 70, y: 52, magnitude: 3.7 },
      { id: 'deneb', label: 'Deneb Algedi', x: 80, y: 62, magnitude: 2.8 },
      { id: 'omega', label: 'Omega Capricorni', x: 48, y: 75, magnitude: 4.1 },
    ],
    connections: [
      { from: 'algiedi', to: 'dabih' },
      { from: 'dabih', to: 'omega' },
      { from: 'omega', to: 'deneb' },
      { from: 'deneb', to: 'nashira' },
      { from: 'nashira', to: 'dabih' },
    ],
  },
  {
    id: 'aquarius',
    name: '水瓶座',
    latin: 'Aquarius',
    symbol: '♒',
    element: 'Air',
    stars: [
      { id: 'sadalsuud', label: 'Sadalsuud', x: 35, y: 38, magnitude: 2.9 },
      { id: 'sadalmelik', label: 'Sadalmelik', x: 48, y: 25, magnitude: 3 },
      { id: 'skats', label: 'Skat', x: 68, y: 62, magnitude: 3.3 },
      { id: 'ancha', label: 'Ancha', x: 42, y: 60, magnitude: 4.1 },
      { id: 'albali', label: 'Albali', x: 23, y: 69, magnitude: 3.8 },
      { id: 'situla', label: 'Situla', x: 71, y: 32, magnitude: 5 },
    ],
    connections: [
      { from: 'sadalsuud', to: 'sadalmelik' },
      { from: 'sadalsuud', to: 'ancha' },
      { from: 'ancha', to: 'albali' },
      { from: 'ancha', to: 'skats' },
      { from: 'sadalmelik', to: 'situla' },
      { from: 'situla', to: 'skats' },
    ],
  },
  {
    id: 'pisces',
    name: '双鱼座',
    latin: 'Pisces',
    symbol: '♓',
    element: 'Water',
    stars: [
      { id: 'alrescha', label: 'Alrescha', x: 50, y: 73, magnitude: 3.8 },
      { id: 'fomal', label: 'Fum al Samakah', x: 27, y: 38, magnitude: 4.5 },
      { id: 'torcular', label: 'Torcular', x: 43, y: 48, magnitude: 4.3 },
      { id: 'omega-p', label: 'Omega Piscium', x: 67, y: 45, magnitude: 4 },
      { id: 'kappa', label: 'Kappa Piscium', x: 77, y: 30, magnitude: 4.9 },
      { id: 'iota-p', label: 'Iota Piscium', x: 23, y: 22, magnitude: 4.1 },
    ],
    connections: [
      { from: 'iota-p', to: 'fomal' },
      { from: 'fomal', to: 'torcular' },
      { from: 'torcular', to: 'alrescha' },
      { from: 'alrescha', to: 'omega-p' },
      { from: 'omega-p', to: 'kappa' },
    ],
  },
]

const zodiacMottos: Record<string, { archetype: string; traits: string }> = {
  aries: { archetype: 'The Initiator', traits: 'Brave · Direct · Restless' },
  taurus: { archetype: 'The Keeper', traits: 'Patient · Sensual · Steady' },
  gemini: { archetype: 'The Messenger', traits: 'Curious · Quick · Bright' },
  cancer: { archetype: 'The Nurturer', traits: 'Intuitive · Protective · Imaginative' },
  leo: { archetype: 'The Radiant', traits: 'Warm · Proud · Generous' },
  virgo: { archetype: 'The Weaver', traits: 'Precise · Tender · Useful' },
  libra: { archetype: 'The Harmonist', traits: 'Graceful · Fair · Perceptive' },
  scorpio: { archetype: 'The Deepener', traits: 'Magnetic · Private · Transforming' },
  sagittarius: { archetype: 'The Seeker', traits: 'Open · Restless · Hopeful' },
  capricorn: { archetype: 'The Builder', traits: 'Patient · Exacting · Loyal' },
  aquarius: { archetype: 'The Visionary', traits: 'Clear · Strange · Humane' },
  pisces: { archetype: 'The Dreamer', traits: 'Porous · Poetic · Devoted' },
}

const zodiacMottosZh: Record<string, { archetype: string; traits: string }> = {
  aries: { archetype: '开篇者', traits: '果敢 · 直接 · 不安于室' },
  taurus: { archetype: '守护者', traits: '耐心 · 敏锐 · 稳定' },
  gemini: { archetype: '传信者', traits: '好奇 · 轻盈 · 灵动' },
  cancer: { archetype: '滋养者', traits: '直觉 · 守护 · 想象' },
  leo: { archetype: '发光者', traits: '热烈 · 骄傲 · 慷慨' },
  virgo: { archetype: '编织者', traits: '精确 · 温柔 · 有用' },
  libra: { archetype: '调和者', traits: '优雅 · 公正 · 敏感' },
  scorpio: { archetype: '深潜者', traits: '迷人 · 隐秘 · 蜕变' },
  sagittarius: { archetype: '远行者', traits: '开阔 · 不羁 · 有盼望' },
  capricorn: { archetype: '筑造者', traits: '耐心 · 克制 · 可靠' },
  aquarius: { archetype: '远见者', traits: '清醒 · 独特 · 仁慈' },
  pisces: { archetype: '梦游者', traits: '通透 · 诗意 · 投入' },
}

const uiText = {
  zh: {
    appSubtitle: '写作打卡',
    navCheckIn: '打卡',
    navNotes: '我的笔记',
    navWhiteboards: '添加白板',
    navStats: '统计',
    navCalendar: '日历',
    navSettings: '设置',
    weeklyCompass: '本周罗盘',
    checkIns: '次打卡',
    chooseConstellation: '选择一片星座',
    focusWords: '让文字有处停靠。',
    autoTheme: '自动',
    dayMode: '日间模式',
    nightMode: '夜间模式',
    day: '白昼',
    night: '黑夜',
    linkedNote: '关联笔记',
    lit: '已点亮',
    inProgress: '写作中',
    novelProject: '长篇项目',
    wordsUnit: '字',
    startWriting: '开始写作',
    copyToClipboard: '复制全文',
    copiedToClipboard: '已复制',
    copyIdle: '复制',
    saveMarkdown: '保存 Markdown',
    savedMarkdown: '已保存 Markdown',
    downloadedMarkdown: '已下载 Markdown',
    language: '语言',
    currentLanguage: '中文',
    backToWheel: '返回星图',
    lastOrbit: '上次停泊',
    indentMode: '段落缩进',
    chinese: '中文',
    english: '英文',
    noIndent: '不缩进',
    chars: '字符',
    page: '第',
    pageSuffix: '页',
    previousPage: '上一页',
    nextPage: '下一页',
    starAnchors: '星标锚点',
    setAnchor: '设为锚点',
    save: '保存',
    cancel: '取消',
    close: '关闭',
    index: '位置',
    dockingQuestion: '此刻星轨的尽头是？',
    leave: '离开',
    notesEyebrow: '□ 我的笔记',
    notesTitle: '所有关联写作',
    searchByTitle: '按标题搜索',
    searchPlaceholder: '输入标题关键词...',
    notesCount: '篇笔记',
    modified: '更新于',
    open: '打开',
    statsEyebrow: '▥ 统计',
    statsTitle: '写作星图概览',
    totalWords: '累计字数',
    litStars: '已点亮星点',
    completion: '完成度',
    activeNotes: '有内容的笔记',
    calendarEyebrow: '☽ 日历',
    calendarTitleSuffix: '写作记录',
    calendarWords: '字',
    settingsEyebrow: '⚙ 设置',
    settingsTitle: '写作系统设置',
    noteTarget: '当前笔记目标字数',
    leftQuote: '左侧语录',
    leftQuoteAuthor: '左侧语录作者',
    typographyTitle: '字体',
    chineseFont: '中文字体',
    englishFont: '英文字体',
    importChineseFont: '导入中文字体',
    importEnglishFont: '导入英文字体',
    fontImportFailed: '字体导入失败，请确认文件格式正确后重试。',
    fontImported: '字体已导入并启用。',
    fontDeleted: '字体已删除。',
    fontStorageFailed: '字体配置无法写入本地存储，已保留页面可用状态。请删除过大的导入字体后再试。',
    importedFonts: '已导入字体',
    noImportedFonts: '还没有导入字体',
    activeFont: '正在启用',
    useFont: '启用',
    deleteFont: '删除',
    migrationTitle: '备份与迁移',
    backupNow: '立即备份',
    restoreBackup: '从备份恢复',
    exportMigration: '导出迁移文件',
    backupSaved: '备份已保存：',
    backupRestored: '备份已恢复。',
    backupEmpty: '还没有找到可恢复的备份。',
    backupFailed: '备份或迁移失败，请稍后重试。',
    migrationExported: '迁移文件已导出：',
    whiteboardsEyebrow: '◎ 白板',
    whiteboardsTitle: '人物与世界观白板',
    newWhiteboard: '新建白板',
    searchWhiteboards: '搜索白板标题',
    whiteboardPlaceholder: '输入白板标题...',
    noWhiteboards: '还没有白板',
    deleteWhiteboard: '删除白板',
    exportPdf: '导出 PDF',
    addPoint: '圆点',
    connectPoints: '连线',
    handDraw: '手绘',
    eraseDrawings: '擦除',
    undoWhiteboard: '撤回',
    moveCanvas: '拖拽',
    importSketch: '导入手绘图片',
    pointText: '人物 / 地点 / 设定',
    lineText: '关系 / 矛盾 / 线索',
  },
  en: {
    appSubtitle: 'WRITING CHECK-IN',
    navCheckIn: 'Check-In',
    navNotes: 'My Notes',
    navWhiteboards: 'Whiteboards',
    navStats: 'Statistics',
    navCalendar: 'Calendar',
    navSettings: 'Settings',
    weeklyCompass: 'Weekly Compass',
    checkIns: 'Check-Ins',
    chooseConstellation: 'Choose a constellation',
    focusWords: 'to focus your words.',
    autoTheme: 'Auto',
    dayMode: 'Day Mode',
    nightMode: 'Night Mode',
    day: 'Day',
    night: 'Night',
    linkedNote: 'Linked Note',
    lit: 'Lit',
    inProgress: 'In Progress',
    novelProject: 'Novel Project',
    wordsUnit: 'WORDS',
    startWriting: 'Start Writing',
    copyToClipboard: 'Copy to Clipboard',
    copiedToClipboard: 'Copied to Clipboard',
    copyIdle: 'Copy',
    saveMarkdown: 'Save Markdown',
    savedMarkdown: 'Saved Markdown',
    downloadedMarkdown: 'Downloaded Markdown',
    language: 'Language',
    currentLanguage: 'English',
    backToWheel: 'Back to Wheel',
    lastOrbit: 'Last orbit',
    indentMode: 'Paragraph indentation mode',
    chinese: 'Chinese',
    english: 'English',
    noIndent: 'No Indent',
    chars: 'chars',
    page: 'Page',
    pageSuffix: '',
    previousPage: 'Previous Page',
    nextPage: 'Next Page',
    starAnchors: 'Star anchors',
    setAnchor: 'Set anchor',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    index: 'Index',
    dockingQuestion: '此刻星轨的尽头是？',
    leave: 'Leave',
    notesEyebrow: '□ My Notes',
    notesTitle: 'Linked writing pieces',
    searchByTitle: 'Search by title',
    searchPlaceholder: 'Type a title...',
    notesCount: 'notes',
    modified: 'Modified',
    open: 'Open',
    statsEyebrow: '▥ Statistics',
    statsTitle: 'Writing constellation health',
    totalWords: 'Total Words',
    litStars: 'Lit Stars',
    completion: 'Completion',
    activeNotes: 'Active Notes',
    calendarEyebrow: '☽ Calendar',
    calendarTitleSuffix: 'writing log',
    calendarWords: 'words',
    settingsEyebrow: '⚙ Settings',
    settingsTitle: 'Writing system controls',
    noteTarget: 'Current note target',
    leftQuote: 'Left quote',
    leftQuoteAuthor: 'Left quote author',
    typographyTitle: 'Typography',
    chineseFont: 'Chinese font',
    englishFont: 'English font',
    importChineseFont: 'Import Chinese font',
    importEnglishFont: 'Import English font',
    fontImportFailed: 'Font import failed. Please check the file format and try again.',
    fontImported: 'Font imported and enabled.',
    fontDeleted: 'Font deleted.',
    fontStorageFailed: 'Font settings could not be saved locally. The page is still usable; remove oversized imported fonts and try again.',
    importedFonts: 'Imported fonts',
    noImportedFonts: 'No imported fonts yet',
    activeFont: 'Active',
    useFont: 'Use',
    deleteFont: 'Delete',
    migrationTitle: 'Backup & Migration',
    backupNow: 'Back Up Now',
    restoreBackup: 'Restore Backup',
    exportMigration: 'Export Migration File',
    backupSaved: 'Backup saved: ',
    backupRestored: 'Backup restored.',
    backupEmpty: 'No backup was found to restore.',
    backupFailed: 'Backup or migration failed. Please try again.',
    migrationExported: 'Migration file exported: ',
    whiteboardsEyebrow: '◎ Whiteboards',
    whiteboardsTitle: 'Characters & world maps',
    newWhiteboard: 'New Whiteboard',
    searchWhiteboards: 'Search whiteboard titles',
    whiteboardPlaceholder: 'Whiteboard title...',
    noWhiteboards: 'No whiteboards yet',
    deleteWhiteboard: 'Delete whiteboard',
    exportPdf: 'Export PDF',
    addPoint: 'Point',
    connectPoints: 'Connect',
    handDraw: 'Draw',
    eraseDrawings: 'Erase',
    undoWhiteboard: 'Undo',
    moveCanvas: 'Move',
    importSketch: 'Import sketch',
    pointText: 'Character / place / lore',
    lineText: 'Relationship / conflict / clue',
  },
} satisfies Record<Language, Record<string, string>>

const zhFontPresets = [
  { label: '宋体雅致', value: "'Songti SC', 'Noto Serif CJK SC', serif" },
  { label: '苹方清朗', value: "'PingFang SC', 'Hiragino Sans GB', sans-serif" },
  { label: '楷体手稿', value: "'Kaiti SC', 'STKaiti', serif" },
  { label: '华文宋体', value: "'STSong', 'Songti SC', serif" },
]

const enFontPresets = [
  { label: 'Iowan Old Style', value: "'Iowan Old Style', Georgia, serif" },
  { label: 'Baskerville', value: "Baskerville, 'Baskerville Old Face', serif" },
  { label: 'Didot', value: "Didot, 'Bodoni 72', serif" },
  { label: 'Avenir', value: "'Avenir Next', 'Helvetica Neue', sans-serif" },
]

const titleSeed = 'Tides Remember What We Forget'
const draftSeed =
  'The tide remembers what the shore pretends to release, and every return leaves a brighter mark inside the dark.'

function buildPreviewDraft() {
  const seedWords = draftSeed.split(' ')
  const words = Array.from({ length: 3247 }, (_, index) => seedWords[index % seedWords.length])

  return Array.from({ length: Math.ceil(words.length / 95) }, (_, index) =>
    words.slice(index * 95, index * 95 + 95).join(' '),
  ).join('\n\n')
}

const storageKey = 'zodiac-writing-pieces-v2'
const whiteboardStorageKey = 'zodiac-writing-whiteboards-v1'
const copyStorageKey = 'zodiac-writing-copy-v1'
const themeStorageKey = 'zodiac-writing-theme-v1'
const languageStorageKey = 'zodiac-writing-language-v1'
const fontStorageKey = 'zodiac-writing-fonts-v1'
const fontDatabaseName = 'stellaris-imported-fonts-v1'
const fontStoreName = 'fonts'
const appSnapshotSchemaVersion = 1
const editorPageSize = 1800
const initialUpdatedAt = '2026-06-30T00:00:00.000Z'

const defaultCopy: AppCopy = {
  leftSlogan: "The stars don't write for you.\nThey remind you why you do.",
  quote: 'Your words are the stars\nyou bring into being.',
  author: 'Anais Nin',
}

const defaultFontSettings: FontSettings = {
  zhFont: zhFontPresets[0].value,
  enFont: enFontPresets[0].value,
  zhImports: [],
  enImports: [],
}

function normalizeFontSettings(value: Partial<FontSettings> | null): FontSettings {
  const normalizeImports = (imports: FontImport[] | undefined) =>
    (imports ?? []).filter(
      (font) =>
        typeof font.label === 'string' &&
        typeof font.family === 'string' &&
        ((typeof font.dataUrl === 'string' && font.dataUrl.startsWith('data:')) ||
          typeof font.storageKey === 'string'),
    )

  return {
    ...defaultFontSettings,
    ...value,
    zhImports: normalizeImports(value?.zhImports),
    enImports: normalizeImports(value?.enImports),
  }
}

function parseStoredJson<T>(key: string, fallback: T): T {
  const saved = window.localStorage.getItem(key)

  if (!saved) {
    return fallback
  }

  try {
    return JSON.parse(saved) as T
  } catch (error) {
    console.warn(`Ignoring invalid local storage entry: ${key}`, error)
    return fallback
  }
}

function normalizeAppSnapshot(value: unknown): AppSnapshot | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const snapshot = value as Partial<AppSnapshot>

  if (
    snapshot.schemaVersion !== appSnapshotSchemaVersion ||
    typeof snapshot.savedAt !== 'string' ||
    !snapshot.pieces ||
    typeof snapshot.pieces !== 'object' ||
    !snapshot.appCopy ||
    typeof snapshot.appCopy !== 'object'
  ) {
    return null
  }

  const themeMode =
    snapshot.themeMode === 'day' || snapshot.themeMode === 'night' || snapshot.themeMode === 'auto'
      ? snapshot.themeMode
      : 'auto'
  const language = snapshot.language === 'en' ? 'en' : 'zh'

  return {
    schemaVersion: appSnapshotSchemaVersion,
    savedAt: snapshot.savedAt,
    pieces: normalizePieces({
      ...createInitialPieces(),
      ...snapshot.pieces,
    }),
    whiteboards: normalizeWhiteboards(snapshot.whiteboards),
    appCopy: {
      ...defaultCopy,
      ...snapshot.appCopy,
    },
    themeMode,
    language,
  }
}

function latestPiecesTimestamp(pieces: Record<string, WritingPiece>) {
  return Object.values(pieces).reduce((latest, piece) => {
    const timestamp = Date.parse(piece.updatedAt)
    return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest
  }, 0)
}

function createAppSnapshot(
  pieces: Record<string, WritingPiece>,
  whiteboards: Record<string, Whiteboard>,
  appCopy: AppCopy,
  themeMode: ThemeMode,
  language: Language,
): AppSnapshot {
  return {
    schemaVersion: appSnapshotSchemaVersion,
    savedAt: new Date().toISOString(),
    pieces,
    whiteboards,
    appCopy,
    themeMode,
    language,
  }
}

function isTauriRuntime() {
  return '__TAURI_INTERNALS__' in window
}

function obsidianBridge() {
  return window.StellarisObsidianBridge
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return window.btoa(binary)
}

function openFontDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(fontDatabaseName, 1)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(fontStoreName)) {
        db.createObjectStore(fontStoreName, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function saveImportedFont(storageKey: string, file: File) {
  const db = await openFontDatabase()

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(fontStoreName, 'readwrite')
    const store = transaction.objectStore(fontStoreName)

    store.put({
      id: storageKey,
      blob: file,
      name: file.name,
      type: file.type,
      updatedAt: new Date().toISOString(),
    })
    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
    transaction.onabort = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

async function loadImportedFont(storageKey: string) {
  const db = await openFontDatabase()

  return new Promise<Blob | null>((resolve, reject) => {
    const transaction = db.transaction(fontStoreName, 'readonly')
    const store = transaction.objectStore(fontStoreName)
    const request = store.get(storageKey)

    request.onsuccess = () => {
      const record = request.result as { blob?: Blob } | undefined
      resolve(record?.blob ?? null)
    }
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
    transaction.onabort = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

async function deleteImportedFont(storageKey: string) {
  const db = await openFontDatabase()

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(fontStoreName, 'readwrite')
    const store = transaction.objectStore(fontStoreName)

    store.delete(storageKey)
    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
    transaction.onabort = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

function fontOptionKey(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-')
}

function customFontCss(settings: FontSettings, fontUrls: Record<string, string>) {
  return [...settings.zhImports, ...settings.enImports]
    .map((font) => {
      const source = font.dataUrl ?? (font.storageKey ? fontUrls[font.storageKey] : '')

      if (!source) {
        return ''
      }

      return `@font-face {
  font-family: "${font.family.replace(/["\\]/g, '')}";
  src: url("${source.replace(/["\\\n\r]/g, '')}");
  font-display: swap;
}`
    })
    .join('\n')
}

function createInitialPieces() {
  return Object.fromEntries(
    zodiacs.flatMap((zodiac) =>
      zodiac.stars.map((star) => {
        const id = `${zodiac.id}-${star.id}`
        return [
          id,
          {
            id,
            zodiacId: zodiac.id,
            starId: star.id,
            title:
              zodiac.id === 'cancer' && star.id === 'acubens'
                ? titleSeed
                : `${zodiac.latin} · ${star.label}`,
            content:
              zodiac.id === 'cancer' && star.id === 'acubens'
                ? buildPreviewDraft()
                : '',
            target: 3000,
            paragraphMode: 'en',
            updatedAt: initialUpdatedAt,
            anchors: [],
            dockLog: '',
          } satisfies WritingPiece,
        ]
      }),
    ),
  )
}

function createId(prefix: string) {
  const id =
    typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return `${prefix}-${id}`
}

function createInitialWhiteboard(): Whiteboard {
  return {
    id: createId('board'),
    title: 'Character Constellation',
    updatedAt: new Date().toISOString(),
    nodes: [
      { id: createId('node'), x: 360, y: 220, text: 'Protagonist' },
      { id: createId('node'), x: 640, y: 300, text: 'Hidden ally' },
    ],
    edges: [],
    strokes: [],
    images: [],
  }
}

function normalizeWhiteboard(value: Partial<Whiteboard>): Whiteboard {
  return {
    id: typeof value.id === 'string' ? value.id : createId('board'),
    title: typeof value.title === 'string' && value.title.trim() ? value.title : 'Untitled Board',
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
    nodes: Array.isArray(value.nodes)
      ? value.nodes.filter((node): node is WhiteboardNode => typeof node.id === 'string')
      : [],
    edges: Array.isArray(value.edges)
      ? value.edges.filter((edge): edge is WhiteboardEdge => typeof edge.id === 'string')
      : [],
    strokes: Array.isArray(value.strokes)
      ? value.strokes.filter((stroke): stroke is WhiteboardStroke => typeof stroke.id === 'string')
      : [],
    images: Array.isArray(value.images)
      ? value.images.filter((image): image is WhiteboardImage => typeof image.id === 'string')
      : [],
  }
}

function normalizeWhiteboards(value: Record<string, Whiteboard> | null | undefined) {
  const entries = Object.values(value ?? {}).map((board) => normalizeWhiteboard(board))

  if (entries.length === 0) {
    const board = createInitialWhiteboard()
    return { [board.id]: board }
  }

  return Object.fromEntries(entries.map((board) => [board.id, board]))
}

function normalizePieces(pieces: Record<string, WritingPiece>) {
  return Object.fromEntries(
    Object.entries(pieces).map(([id, piece]) => [
      id,
      {
        ...piece,
        updatedAt: piece.updatedAt ?? initialUpdatedAt,
        anchors: piece.anchors ?? [],
        dockLog: piece.dockLog ?? '',
      },
    ]),
  )
}

function countWriting(content: string): WritingStats {
  const cjkMatches = content.match(/[\u3400-\u9fff]/g) ?? []
  const wordMatches = content.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) ?? []
  const visibleCharacters = content.replace(/\s/g, '').length

  return {
    characters: visibleCharacters,
    words: wordMatches.length,
    effective: cjkMatches.length + wordMatches.length,
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeYaml(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function safeMarkdownFilename(value: string) {
  const name = value
    .replace(/[/:*?"<>|\\]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+|\.+$/g, '')

  return `${name || 'Untitled Note'}.md`
}

function plainTextForExport(content: string) {
  return content
    .split(/\n{2,}|\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.trim().length > 0)
    .join('\n\n')
}

function htmlForExport(piece: WritingPiece) {
  return piece.content
    .split(/\n{2,}|\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 12px;line-height:1.8;">${escapeHtml(paragraph)}</p>`,
    )
    .join('')
}

function connectionKey(zodiac: Zodiac, connection: StarConnection) {
  return `${zodiac.id}-${connection.from}-${connection.to}`
}

function textSymbol(symbol: string) {
  return `${symbol}\uFE0E`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function starTone(starId: string) {
  return Array.from(starId).reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    2 ===
    0
    ? 'gold'
    : 'blue'
}

function getAutoTheme(date: Date): ActiveTheme {
  const hour = date.getHours()
  return hour >= 6 && hour < 18 ? 'day' : 'night'
}

function formatClock(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

function starIntensity(piece: WritingPiece) {
  return Math.min(100, Math.floor(countWriting(piece.content).effective / 30))
}

function markdownForPiece(
  piece: WritingPiece,
  zodiac: Zodiac,
  star: ConstellationStar,
) {
  const stats = countWriting(piece.content)
  const body = plainTextForExport(piece.content).trim()

  return [
    '---',
    `title: "${escapeYaml(piece.title)}"`,
    `zodiac: "${escapeYaml(zodiac.latin)}"`,
    `star: "${escapeYaml(star.label)}"`,
    `words: ${stats.effective}`,
    `characters: ${stats.characters}`,
    `target: ${piece.target}`,
    `paragraphMode: "${piece.paragraphMode}"`,
    `exportedAt: "${new Date().toISOString()}"`,
    '---',
    '',
    `# ${piece.title}`,
    '',
    `- Zodiac: ${zodiac.latin}`,
    `- Star: ${star.label}`,
    `- Progress: ${formatNumber(stats.effective)} / ${formatNumber(piece.target)} words`,
    '',
    body || '_No writing yet._',
    '',
  ].join('\n')
}

function obsidianCanvasForWhiteboard(board: Whiteboard) {
  const nodes = [
    ...board.nodes.map((node) => ({
      id: node.id,
      type: 'text',
      x: Math.round(node.x),
      y: Math.round(node.y),
      width: 260,
      height: 120,
      text: node.text || board.title,
    })),
    ...board.images.map((image) => ({
      id: image.id,
      type: 'text',
      x: Math.round(image.x),
      y: Math.round(image.y),
      width: Math.round(image.width),
      height: Math.round(image.height),
      text: 'Imported sketch image is stored in Stellaris plugin data.',
    })),
    ...board.strokes.map((stroke, index) => {
      const first = stroke.points[0] ?? { x: 80 + index * 24, y: 80 + index * 24 }
      return {
        id: stroke.id,
        type: 'text',
        x: Math.round(first.x),
        y: Math.round(first.y),
        width: 240,
        height: 90,
        text: `Freehand stroke ${index + 1}`,
      }
    }),
  ]
  const edges = board.edges.map((edge) => ({
    id: edge.id,
    fromNode: edge.from,
    fromSide: 'right',
    toNode: edge.to,
    toSide: 'left',
    label: edge.label,
  }))

  return JSON.stringify({ nodes, edges }, null, 2)
}

function pieceForStar(
  pieces: Record<string, WritingPiece>,
  zodiacId: string,
  starId: string,
) {
  return pieces[`${zodiacId}-${starId}`]
}

function splitIntoPages(content: string) {
  if (!content) {
    return ['']
  }

  const pages: string[] = []

  for (let index = 0; index < content.length; index += editorPageSize) {
    pages.push(content.slice(index, index + editorPageSize))
  }

  return pages
}

function adjustAnchorsForEdit(
  anchors: StarAnchor[],
  oldText: string,
  nextText: string,
  pageOffset: number,
) {
  if (oldText === nextText) {
    return anchors
  }

  let prefixLength = 0
  const maxPrefix = Math.min(oldText.length, nextText.length)

  while (
    prefixLength < maxPrefix &&
    oldText[prefixLength] === nextText[prefixLength]
  ) {
    prefixLength += 1
  }

  let suffixLength = 0

  while (
    suffixLength < oldText.length - prefixLength &&
    suffixLength < nextText.length - prefixLength &&
    oldText[oldText.length - 1 - suffixLength] ===
      nextText[nextText.length - 1 - suffixLength]
  ) {
    suffixLength += 1
  }

  const oldChangeStart = pageOffset + prefixLength
  const oldChangeEnd = pageOffset + oldText.length - suffixLength
  const delta = nextText.length - oldText.length

  return anchors.map((anchor) => {
    if (anchor.end <= oldChangeStart) {
      return anchor
    }

    if (anchor.start >= oldChangeEnd) {
      return {
        ...anchor,
        start: Math.max(0, anchor.start + delta),
        end: Math.max(0, anchor.end + delta),
      }
    }

    return {
      ...anchor,
      end: Math.max(anchor.start, anchor.end + delta),
    }
  })
}

function App() {
  const [selectedIndex, setSelectedIndex] = useState(3)
  const [viewMode, setViewMode] = useState<ViewMode>('galaxy')
  const [selectedStarId, setSelectedStarId] = useState(zodiacs[3].stars[0].id)
  const [copyState, setCopyState] = useState('Copy')
  const [saveState, setSaveState] = useState('Save Markdown')
  const [editorPage, setEditorPage] = useState(0)
  const [pendingViewMode, setPendingViewMode] = useState<ViewMode | null>(null)
  const [dockLogDraft, setDockLogDraft] = useState('')
  const [anchorDraft, setAnchorDraft] = useState<{
    start: number
    end: number
    tag: string
    x: number
    y: number
  } | null>(null)
  const [anchorPreview, setAnchorPreview] = useState<StarAnchor | null>(null)
  const writingSurfaceRef = useRef<HTMLTextAreaElement>(null)
  const lastSnapshotRef = useRef('')
  const [now, setNow] = useState(() => new Date())
  const [language, setLanguage] = useState<Language>(() => {
    const saved = window.localStorage.getItem(languageStorageKey)
    return saved === 'en' ? 'en' : 'zh'
  })
  const [fontNotice, setFontNotice] = useState('')
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = window.localStorage.getItem(themeStorageKey)
    return saved === 'day' || saved === 'night' || saved === 'auto' ? saved : 'auto'
  })
  const [fontSettings, setFontSettings] = useState<FontSettings>(() => {
    return normalizeFontSettings(parseStoredJson<Partial<FontSettings> | null>(fontStorageKey, null))
  })
  const [fontUrls, setFontUrls] = useState<Record<string, string>>({})
  const [migrationNotice, setMigrationNotice] = useState('')
  const [appCopy, setAppCopy] = useState<AppCopy>(() => {
    return {
      ...defaultCopy,
      ...parseStoredJson<Partial<AppCopy>>(copyStorageKey, {}),
    }
  })
  const [pieces, setPieces] = useState<Record<string, WritingPiece>>(() => {
    return normalizePieces({
      ...createInitialPieces(),
      ...parseStoredJson<Record<string, WritingPiece>>(storageKey, {}),
    })
  })
  const [whiteboards, setWhiteboards] = useState<Record<string, Whiteboard>>(() =>
    normalizeWhiteboards(parseStoredJson<Record<string, Whiteboard> | null>(whiteboardStorageKey, null)),
  )
  const startupPiecesRef = useRef(pieces)
  const [snapshotReady, setSnapshotReady] = useState(false)

  const selectedZodiac = zodiacs[selectedIndex]
  const selectedStar =
    selectedZodiac.stars.find((star) => star.id === selectedStarId) ??
    selectedZodiac.stars[0]
  const selectedPiece = pieces[`${selectedZodiac.id}-${selectedStar.id}`]
  const selectedStats = countWriting(selectedPiece.content)
  const activeTheme = themeMode === 'auto' ? getAutoTheme(now) : themeMode
  const t = uiText[language]
  const activeMottos = language === 'zh' ? zodiacMottosZh : zodiacMottos
  const activeFontCss = useMemo(
    () => customFontCss(fontSettings, fontUrls),
    [fontSettings, fontUrls],
  )
  const activeAppFont = language === 'zh' ? fontSettings.zhFont : fontSettings.enFont
  const appStyle = {
    '--font-zh': fontSettings.zhFont,
    '--font-en': fontSettings.enFont,
    '--font-active': activeAppFont,
    '--display': `var(--font-active), ${language === 'zh' ? fontSettings.enFont : fontSettings.zhFont}, Didot, 'Bodoni 72', serif`,
    '--serif': `var(--font-active), ${language === 'zh' ? fontSettings.enFont : fontSettings.zhFont}, Georgia, serif`,
    '--sans': `var(--font-active), 'Avenir Next', 'Helvetica Neue', 'PingFang SC', Arial, sans-serif`,
  } as CSSProperties
  const editorPages = splitIntoPages(selectedPiece.content)
  const currentEditorPage = Math.min(editorPage, editorPages.length - 1)
  const currentEditorText = editorPages[currentEditorPage] ?? ''
  const anchorPreviewText = anchorPreview
    ? selectedPiece.content.slice(anchorPreview.start, anchorPreview.end)
    : ''

  const zodiacProgress = useMemo(() => {
    return zodiacs.map((zodiac) => {
      const lit = zodiac.stars.filter((star) => {
        const piece = pieces[`${zodiac.id}-${star.id}`]
        return countWriting(piece.content).effective >= piece.target
      }).length

      return {
        zodiacId: zodiac.id,
        lit,
        total: zodiac.stars.length,
      }
    })
  }, [pieces])

  const totalProgress = useMemo(() => {
    const lit = zodiacProgress.reduce((sum, item) => sum + item.lit, 0)
    const total = zodiacProgress.reduce((sum, item) => sum + item.total, 0)
    return { lit, total, percent: Math.round((lit / total) * 100) }
  }, [zodiacProgress])

  function applyAppSnapshot(snapshot: AppSnapshot) {
    setPieces(snapshot.pieces)
    setWhiteboards(snapshot.whiteboards)
    setAppCopy(snapshot.appCopy)
    setThemeMode(snapshot.themeMode)
    setLanguage(snapshot.language)
  }

  async function saveSnapshotNow() {
    try {
      const bridge = obsidianBridge()
      const contents = JSON.stringify(createAppSnapshot(pieces, whiteboards, appCopy, themeMode, language))
      const path = bridge
        ? await bridge.saveSnapshot(contents)
        : 'Browser preview storage'
      setMigrationNotice(`${t.backupSaved}${path}`)
    } catch (error) {
      console.warn('Unable to save app snapshot', error)
      setMigrationNotice(t.backupFailed)
    }
  }

  async function restoreSnapshot() {
    try {
      const raw = await obsidianBridge()?.loadSnapshot()

      if (!raw) {
        setMigrationNotice(t.backupEmpty)
        return
      }

      const snapshot = normalizeAppSnapshot(JSON.parse(raw))

      if (!snapshot) {
        setMigrationNotice(t.backupFailed)
        return
      }

      applyAppSnapshot(snapshot)
      setMigrationNotice(t.backupRestored)
    } catch (error) {
      console.warn('Unable to restore app snapshot', error)
      setMigrationNotice(t.backupFailed)
    }
  }

  async function exportMigrationFile() {
    try {
      const contents = JSON.stringify(
        createAppSnapshot(pieces, whiteboards, appCopy, themeMode, language),
        null,
        2,
      )
      const path = await obsidianBridge()?.exportMigrationFile(contents)
      setMigrationNotice(`${t.migrationExported}${path}`)
    } catch (error) {
      console.warn('Unable to export migration file', error)
      setMigrationNotice(t.backupFailed)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function hydrateSnapshot() {
      const bridge = obsidianBridge()
      if (!bridge && !isTauriRuntime()) {
        setSnapshotReady(true)
        return
      }

      try {
        const raw = bridge ? await bridge.loadSnapshot() : null
        const snapshot = raw ? normalizeAppSnapshot(JSON.parse(raw)) : null

        if (!cancelled && snapshot) {
          const snapshotLatest = Math.max(
            latestPiecesTimestamp(snapshot.pieces),
            Date.parse(snapshot.savedAt) || 0,
          )
          const localLatest = latestPiecesTimestamp(startupPiecesRef.current)

          if (snapshotLatest >= localLatest) {
            applyAppSnapshot(snapshot)
          }
        }
      } catch (error) {
        console.warn('Unable to load app snapshot', error)
      } finally {
        if (!cancelled) {
          setSnapshotReady(true)
        }
      }
    }

    hydrateSnapshot()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(pieces))
  }, [pieces])

  useEffect(() => {
    window.localStorage.setItem(whiteboardStorageKey, JSON.stringify(whiteboards))
  }, [whiteboards])

  useEffect(() => {
    const bridge = obsidianBridge()
    if (!snapshotReady || !bridge) {
      return
    }

    const snapshot = createAppSnapshot(pieces, whiteboards, appCopy, themeMode, language)
    const serialized = JSON.stringify(snapshot)

    if (serialized === lastSnapshotRef.current) {
      return
    }

    const timer = window.setTimeout(() => {
      bridge.saveSnapshot(serialized)
        .then((path) => {
          lastSnapshotRef.current = serialized
          console.info(`Saved app snapshot: ${path}`)
        })
        .catch((error) => {
          console.warn('Unable to save app snapshot', error)
        })
    }, 600)

    return () => window.clearTimeout(timer)
  }, [appCopy, language, pieces, snapshotReady, themeMode, whiteboards])

  useEffect(() => {
    window.localStorage.setItem(copyStorageKey, JSON.stringify(appCopy))
  }, [appCopy])

  useEffect(() => {
    window.localStorage.setItem(themeStorageKey, themeMode)
  }, [themeMode])

  useEffect(() => {
    window.localStorage.setItem(languageStorageKey, language)
  }, [language])

  useEffect(() => {
    try {
      window.localStorage.setItem(fontStorageKey, JSON.stringify(fontSettings))
    } catch (error) {
      console.warn('Unable to persist font settings', error)
      setFontNotice(uiText[language].fontStorageFailed)
    }
  }, [fontSettings, language])

  useEffect(() => {
    let cancelled = false
    const objectUrls: string[] = []
    const imports = [...fontSettings.zhImports, ...fontSettings.enImports].filter(
      (font) => font.storageKey,
    )

    async function hydrateImportedFonts() {
      const nextUrls: Record<string, string> = {}

      for (const font of imports) {
        if (!font.storageKey) {
          continue
        }

        try {
          const blob = await loadImportedFont(font.storageKey)

          if (blob) {
            const objectUrl = URL.createObjectURL(blob)
            objectUrls.push(objectUrl)
            nextUrls[font.storageKey] = objectUrl
          }
        } catch (error) {
          console.warn('Unable to load imported font', error)
        }
      }

      if (!cancelled) {
        setFontUrls(nextUrls)
      }
    }

    hydrateImportedFonts()

    return () => {
      cancelled = true
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [fontSettings.zhImports, fontSettings.enImports])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    setEditorPage(0)
  }, [selectedPiece.id])

  function selectZodiac(index: number) {
    const nextIndex = (index + zodiacs.length) % zodiacs.length
    setSelectedIndex(nextIndex)
    setSelectedStarId(zodiacs[nextIndex].stars[0].id)
    setCopyState('Copy')
  }

  function getPieceState(zodiacId: string, starId: string): ProgressState {
    const piece = pieces[`${zodiacId}-${starId}`]

    if (!piece) {
      return 'unbound'
    }

    const stats = countWriting(piece.content)

    if (stats.effective === 0) {
      return 'unbound'
    }

    return stats.effective >= piece.target ? 'lit' : 'draft'
  }

  function getStarIntensity(zodiacId: string, starId: string) {
    const piece = pieceForStar(pieces, zodiacId, starId)
    return piece ? starIntensity(piece) : 0
  }

  function getStarState(starId: string): ProgressState {
    return getPieceState(selectedZodiac.id, starId)
  }

  function updatePiece(pieceId: string, update: Partial<WritingPiece>) {
    setPieces((currentPieces) => ({
      ...currentPieces,
      [pieceId]: {
        ...currentPieces[pieceId],
        ...update,
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  function updateSelectedPiece(update: Partial<WritingPiece>) {
    updatePiece(selectedPiece.id, update)
  }

  function navigateTo(nextViewMode: ViewMode) {
    if (viewMode === 'editor' && nextViewMode !== 'editor') {
      setPendingViewMode(nextViewMode)
      setDockLogDraft('')
      return
    }

    setViewMode(nextViewMode)
  }

  function submitDockLog() {
    updateSelectedPiece({ dockLog: dockLogDraft.trim() || 'over' })

    if (pendingViewMode) {
      setViewMode(pendingViewMode)
    }

    setPendingViewMode(null)
    setDockLogDraft('')
  }

  function updateCurrentEditorPage(pageText: string) {
    const nextPages = [...editorPages]
    const shouldAdvancePage = pageText.length > editorPageSize
    const adjustedAnchors = adjustAnchorsForEdit(
      selectedPiece.anchors,
      currentEditorText,
      pageText,
      currentEditorPage * editorPageSize,
    )

    if (shouldAdvancePage) {
      const overflow = pageText.slice(editorPageSize)
      nextPages[currentEditorPage] = pageText.slice(0, editorPageSize)
      nextPages[currentEditorPage + 1] = `${overflow}${nextPages[currentEditorPage + 1] ?? ''}`
      setEditorPage(currentEditorPage + 1)
      window.requestAnimationFrame(() => {
        writingSurfaceRef.current?.focus()
        if (writingSurfaceRef.current) {
          writingSurfaceRef.current.selectionStart = overflow.length
          writingSurfaceRef.current.selectionEnd = overflow.length
        }
      })
    } else {
      nextPages[currentEditorPage] = pageText
    }

    updateSelectedPiece({ content: nextPages.join(''), anchors: adjustedAnchors })
  }

  function handleWritingKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'a') {
      event.preventDefault()
      openAnchorMenu()
      return
    }
  }

  function openAnchorMenu(event?: MouseEvent<HTMLTextAreaElement>) {
    const target = writingSurfaceRef.current

    if (!target || target.selectionStart === target.selectionEnd) {
      return
    }

    event?.preventDefault()

    const pageOffset = currentEditorPage * editorPageSize
    setAnchorDraft({
      start: pageOffset + target.selectionStart,
      end: pageOffset + target.selectionEnd,
      tag: '#伏笔',
      x: event?.clientX ?? window.innerWidth / 2,
      y: event?.clientY ?? window.innerHeight / 2,
    })
  }

  function createAnchor() {
    if (!anchorDraft) {
      return
    }

    const tag = anchorDraft.tag.trim() || '#锚点'
    const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`
    updateSelectedPiece({
      anchors: [
        ...selectedPiece.anchors,
        {
          id: `${Date.now()}-${anchorDraft.start}`,
          start: anchorDraft.start,
          end: anchorDraft.end,
          tag: normalizedTag,
          createdAt: new Date().toISOString(),
        },
      ],
    })
    setAnchorDraft(null)
  }

  function previewAnchor(anchor: StarAnchor) {
    setAnchorPreview(anchor)
  }

  async function copyPiece() {
    const html = htmlForExport(selectedPiece)
    const text = plainTextForExport(selectedPiece.content)

    if (navigator.clipboard && 'ClipboardItem' in window) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ])
    } else {
      await navigator.clipboard.writeText(text)
    }

    setCopyState('Copied')
    window.setTimeout(() => setCopyState('Copy'), 1600)
  }

  async function savePieceAsMarkdown() {
    const markdown = markdownForPiece(selectedPiece, selectedZodiac, selectedStar)
    const filename = safeMarkdownFilename(
      `${selectedPiece.title} - ${selectedZodiac.latin} - ${selectedStar.label}`,
    )

    try {
      const path = await obsidianBridge()?.saveMarkdownFile({
        filename,
        contents: markdown,
      })
      if (path) {
        setSaveState(`Saved: ${path}`)
      } else {
        throw new Error('Obsidian bridge unavailable')
      }
    } catch {
      const url = URL.createObjectURL(
        new Blob([markdown], { type: 'text/markdown;charset=utf-8' }),
      )
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setSaveState('Downloaded Markdown')
    }

    window.setTimeout(() => setSaveState('Save Markdown'), 2200)
  }

  return (
    <main className={`app-shell theme-${activeTheme} language-${language}`} style={appStyle}>
      {activeFontCss ? <style>{activeFontCss}</style> : null}
      <aside className="sidebar" aria-label="App navigation">
        <button className="brand" type="button" onClick={() => navigateTo('galaxy')}>
          <span className="brand-mark">✦</span>
          <span>
            <strong>STELLARIS</strong>
            <small>{t.appSubtitle}</small>
          </span>
        </button>
        <nav className="side-nav" aria-label="Primary views">
          <button
            className={viewMode === 'galaxy' ? 'active' : ''}
            type="button"
            onClick={() => navigateTo('galaxy')}
          >
            <span>✦</span>
            {t.navCheckIn}
          </button>
          <button
            className={viewMode === 'notes' || viewMode === 'editor' ? 'active' : ''}
            type="button"
            onClick={() => navigateTo('notes')}
          >
            <span>□</span>
            {t.navNotes}
          </button>
          <button
            className={viewMode === 'whiteboards' ? 'active' : ''}
            type="button"
            onClick={() => navigateTo('whiteboards')}
          >
            <span>◎</span>
            {t.navWhiteboards}
          </button>
          <button
            className={viewMode === 'statistics' ? 'active' : ''}
            type="button"
            onClick={() => navigateTo('statistics')}
          >
            <span>▥</span>
            {t.navStats}
          </button>
          <button
            className={viewMode === 'calendar' ? 'active' : ''}
            type="button"
            onClick={() => navigateTo('calendar')}
          >
            <span>☽</span>
            {t.navCalendar}
          </button>
          <button
            className={viewMode === 'settings' ? 'active' : ''}
            type="button"
            onClick={() => navigateTo('settings')}
          >
            <span>⚙</span>
            {t.navSettings}
          </button>
        </nav>
        <div className="sidebar-card moon-card">
          <span>☾</span>
          <p>{appCopy.quote}</p>
          <small>- {appCopy.author}</small>
        </div>
        <div className="sidebar-card compact-card">
          <strong>{t.weeklyCompass}</strong>
          <span>{totalProgress.lit} / 7 {t.checkIns}</span>
          <div>
            <i style={{ width: `${totalProgress.percent}%` }} />
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>{t.chooseConstellation}</p>
            <h2>{t.focusWords}</h2>
          </div>
          <div className="time-theme-cluster">
            <time dateTime={now.toISOString()}>{formatClock(now)}</time>
            <button
              className="moon-toggle"
              type="button"
              onClick={() =>
                setThemeMode((current) =>
                  current === 'auto' ? 'day' : current === 'day' ? 'night' : 'auto',
                )
              }
            >
              {themeMode === 'auto'
                ? `${t.autoTheme} · ${activeTheme === 'day' ? t.day : t.night}`
                : themeMode === 'day'
                  ? `☉ ${t.dayMode}`
                  : `◐ ${t.nightMode}`}
            </button>
          </div>
        </header>

      {viewMode === 'galaxy' ? (
        <section className="galaxy-layout" aria-label="Constellation progress">
          <div className="orbit-panel">
            <div className="orbit" aria-label="Zodiac wheel">
              {zodiacs.map((zodiac, index) => {
                if (index === selectedIndex) {
                  return null
                }

                const angle = ((index - selectedIndex) / zodiacs.length) * 360 + 90
                const progress = zodiacProgress.find(
                  (item) => item.zodiacId === zodiac.id,
                )
                const radian = (angle * Math.PI) / 180
                const depth = Math.cos(radian)
                const x = Math.cos(radian) * 345
                const y = Math.sin(radian) * 300
                const scale = 0.72 + (depth + 1) * 0.16

                return (
                  <button
                    className="zodiac-orb"
                    key={zodiac.id}
                    style={{
                      transform: `translate(${x}px, ${y}px) scale(${scale})`,
                      opacity: 0.3 + (depth + 1) * 0.35,
                      zIndex: Math.round((depth + 1) * 10),
                    }}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectZodiac(index)}
                  >
                    <svg className="mini-map" viewBox="0 0 100 100" aria-hidden="true">
                      {zodiac.connections.map((connection) => {
                        const from = zodiac.stars.find(
                          (star) => star.id === connection.from,
                        )
                        const to = zodiac.stars.find((star) => star.id === connection.to)

                        if (!from || !to) {
                          return null
                        }

                        return (
                          <line
                            key={connectionKey(zodiac, connection)}
                            x1={from.x}
                            x2={to.x}
                            y1={from.y}
                            y2={to.y}
                          />
                        )
                      })}
                      {zodiac.stars.map((star) => {
                        const state = getPieceState(zodiac.id, star.id)
                        const intensity = getStarIntensity(zodiac.id, star.id)
                        const tone = intensity > 0 ? starTone(star.id) : ''
                        const radius =
                          state === 'lit'
                            ? Math.max(2.2, 5.2 - star.magnitude * 0.48)
                            : Math.max(1.05, 2.4 - star.magnitude * 0.18)

                        return (
                          <circle
                            className={`${state} ${tone}`}
                            cx={star.x}
                            cy={star.y}
                            key={star.id}
                            r={radius}
                            style={{
                              '--star-opacity': `${Math.max(0.18, intensity / 100)}`,
                              '--star-glow': `${intensity}`,
                            } as CSSProperties}
                          />
                        )
                      })}
                    </svg>
                    <strong>
                      {language === 'zh' ? zodiac.name : zodiac.latin.toUpperCase()}
                    </strong>
                    <small>
                      {progress?.lit ?? 0}/{progress?.total ?? 0}
                    </small>
                  </button>
                )
              })}
            </div>
            <section className="constellation-panel" aria-labelledby="constellation-title">
              <div className="section-heading">
                <div>
                  <h1 id="constellation-title">
                    {language === 'zh' ? selectedZodiac.name : selectedZodiac.latin.toUpperCase()}
                  </h1>
                  <p>
                    {language === 'zh'
                      ? activeMottos[selectedZodiac.id].archetype
                      : activeMottos[selectedZodiac.id].archetype.toUpperCase()}
                  </p>
                  <small>{activeMottos[selectedZodiac.id].traits}</small>
                </div>
              </div>

              <svg className="constellation-map" viewBox="0 0 100 100" role="img">
                <defs>
                  <filter id="star-glow">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {selectedZodiac.connections.map((connection) => {
                  const from = selectedZodiac.stars.find(
                    (star) => star.id === connection.from,
                  )
                  const to = selectedZodiac.stars.find((star) => star.id === connection.to)

                  if (!from || !to) {
                    return null
                  }

                  return (
                    <line
                      className="star-line"
                      key={connectionKey(selectedZodiac, connection)}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                    />
                  )
                })}
                {selectedZodiac.stars.map((star) => {
                  const state = getStarState(star.id)
                  const intensity = getStarIntensity(selectedZodiac.id, star.id)
                  const tone = intensity > 0 ? starTone(star.id) : ''
                  const radius =
                    state === 'lit'
                      ? Math.max(3.4, 7.4 - star.magnitude * 0.64)
                      : Math.max(1.4, 3.1 - star.magnitude * 0.24)

                  return (
                    <g
                      className={`star-node ${state} ${tone}`}
                      key={star.id}
                    >
                      <circle
                        className="star-hit-area"
                        cx={star.x}
                        cy={star.y}
                        r="10"
                        onClick={() => setSelectedStarId(star.id)}
                      />
                      <circle
                        className={selectedStar.id === star.id ? 'selected-star' : ''}
                        cx={star.x}
                        cy={star.y}
                        filter={state === 'lit' ? 'url(#star-glow)' : undefined}
                        r={radius}
                        style={{
                          '--star-opacity': `${Math.max(0.18, intensity / 100)}`,
                          '--star-glow': `${intensity}`,
                        } as CSSProperties}
                        onClick={() => setSelectedStarId(star.id)}
                      />
                      <text x={star.x + 4} y={star.y - 3}>
                        {star.label}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </section>
          </div>

          <aside className="status-column" aria-label="Writing status">
            <section className="note-panel">
              <div>
                <small className="linked-note">▣ {t.linkedNote}</small>
                <span className={`status-pill ${getStarState(selectedStar.id)}`}>
                  {getStarState(selectedStar.id) === 'lit' ? t.lit : t.inProgress}
                </span>
                <h2>{selectedPiece.title}</h2>
                <p>{t.novelProject}</p>
              </div>
              <div className="metric">
                <strong>{formatNumber(selectedStats.effective)}</strong>
                <span>/ {formatNumber(selectedPiece.target)} {t.wordsUnit}</span>
              </div>
              <div className="meter">
                <i
                  style={{
                    width: `${Math.min(
                      100,
                      (selectedStats.effective / selectedPiece.target) * 100,
                    )}%`,
                  }}
                />
              </div>
              <button className="primary-action" type="button" onClick={() => navigateTo('editor')}>
                {t.startWriting}
              </button>
              <button className="secondary-action" type="button" onClick={copyPiece}>
                {copyState === 'Copied' ? t.copiedToClipboard : t.copyToClipboard}
              </button>
              <button className="secondary-action" type="button" onClick={savePieceAsMarkdown}>
                {saveState.startsWith('Saved')
                  ? t.savedMarkdown
                  : saveState === 'Downloaded Markdown'
                    ? t.downloadedMarkdown
                    : t.saveMarkdown}
              </button>
              <button
                className="language-toggle"
                type="button"
                onClick={() => setLanguage((current) => (current === 'zh' ? 'en' : 'zh'))}
              >
                <span>{t.language}</span>
                <strong>{t.currentLanguage}</strong>
              </button>
            </section>
          </aside>
        </section>
      ) : viewMode === 'editor' ? (
        <section className="editor-layout" aria-label="Writing editor">
          <div className="editor-meta">
            <button type="button" onClick={() => navigateTo('galaxy')}>
              {t.backToWheel}
            </button>
            <div>
              <span>{selectedZodiac.latin} / {selectedStar.label}</span>
              <input
                aria-label="Title"
                value={selectedPiece.title}
                onChange={(event) => updateSelectedPiece({ title: event.target.value })}
              />
            </div>
          </div>

          {selectedPiece.dockLog ? (
            <aside className="dock-log-banner" aria-label={t.lastOrbit}>
              <span>{t.lastOrbit}</span>
              <p>{selectedPiece.dockLog}</p>
            </aside>
          ) : null}

          <div className="editor-tools">
            <div className="segmented-control" aria-label={t.indentMode}>
              {(['zh', 'en', 'none'] as ParagraphMode[]).map((mode) => (
                <button
                  className={selectedPiece.paragraphMode === mode ? 'active' : ''}
                  key={mode}
                  type="button"
                  onClick={() => updateSelectedPiece({ paragraphMode: mode })}
                >
                  {mode === 'zh' ? t.chinese : mode === 'en' ? t.english : t.noIndent}
                </button>
              ))}
            </div>
            <div className="editor-counts">
              <span>{formatNumber(selectedStats.characters)} {t.chars}</span>
              <span>{formatNumber(selectedStats.words)} {t.wordsUnit.toLowerCase()}</span>
              <strong>
                {formatNumber(selectedStats.effective)}/{formatNumber(selectedPiece.target)}
              </strong>
            </div>
            <button className="copy-button" type="button" onClick={copyPiece}>
              {copyState === 'Copied' ? t.copiedToClipboard : t.copyIdle}
            </button>
            <button className="copy-button" type="button" onClick={savePieceAsMarkdown}>
              {saveState.startsWith('Saved') ? t.savedMarkdown : t.saveMarkdown}
            </button>
          </div>

          <div className="page-controls" aria-label="Editor pages">
            <button
              type="button"
              disabled={currentEditorPage === 0}
              onClick={() => setEditorPage((page) => Math.max(0, page - 1))}
            >
              {t.previousPage}
            </button>
            <span>
              {language === 'zh'
                ? `${t.page}${currentEditorPage + 1} / ${editorPages.length}${t.pageSuffix}`
                : `${t.page} ${currentEditorPage + 1} / ${editorPages.length}`}
            </span>
            <button
              type="button"
              disabled={currentEditorPage >= editorPages.length - 1}
              onClick={() =>
                setEditorPage((page) => Math.min(editorPages.length - 1, page + 1))
              }
            >
              {t.nextPage}
            </button>
          </div>

          <textarea
            className={`writing-surface indent-${selectedPiece.paragraphMode}`}
            onKeyDown={handleWritingKeyDown}
            onChange={(event) => updateCurrentEditorPage(event.target.value)}
            onContextMenu={openAnchorMenu}
            ref={writingSurfaceRef}
            spellCheck="true"
            value={currentEditorText}
          />
          {selectedPiece.anchors.length > 0 ? (
            <div className="anchor-index" aria-label={t.starAnchors}>
              <span>{t.starAnchors}</span>
              <div>
                {selectedPiece.anchors.map((anchor) => (
                  <button key={anchor.id} type="button" onClick={() => previewAnchor(anchor)}>
                    <strong>{anchor.tag}</strong>
                    <small>{selectedPiece.content.slice(anchor.start, anchor.end)}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {anchorDraft ? (
            <div
              className="anchor-menu"
              style={{
                left: anchorDraft.x,
                top: anchorDraft.y,
              }}
            >
              <span>{t.setAnchor}</span>
              <input
                aria-label="Anchor tag"
                autoFocus
                value={anchorDraft.tag}
                onChange={(event) =>
                  setAnchorDraft((current) =>
                    current ? { ...current, tag: event.target.value } : current,
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    createAnchor()
                  }
                }}
              />
              <div>
                <button type="button" onClick={createAnchor}>
                  {t.save}
                </button>
                <button type="button" onClick={() => setAnchorDraft(null)}>
                  {t.cancel}
                </button>
              </div>
            </div>
          ) : null}

          {anchorPreview ? (
            <div className="anchor-preview" role="dialog" aria-label="Anchor preview">
              <button type="button" onClick={() => setAnchorPreview(null)}>
                {t.close}
              </button>
              <span>{anchorPreview.tag}</span>
              <p>{anchorPreviewText}</p>
              <small>
                {t.index} {anchorPreview.start} - {anchorPreview.end}
              </small>
            </div>
          ) : null}
        </section>
      ) : (
        <section
          className={`utility-layout ${viewMode === 'whiteboards' ? 'whiteboard-utility' : ''}`}
          aria-label={`${viewMode} view`}
        >
          {viewMode === 'notes' ? (
            <NotesView
              onTitleChange={(pieceId, title) => updatePiece(pieceId, { title })}
              pieces={pieces}
              language={language}
              selectedPieceId={selectedPiece.id}
              onOpen={(piece) => {
                const zodiacIndex = zodiacs.findIndex(
                  (zodiac) => zodiac.id === piece.zodiacId,
                )
                setSelectedIndex(zodiacIndex)
                setSelectedStarId(piece.starId)
                setViewMode('editor')
              }}
            />
          ) : null}
          {viewMode === 'whiteboards' ? (
            <WhiteboardsView
              language={language}
              whiteboards={whiteboards}
              onWhiteboardsChange={setWhiteboards}
            />
          ) : null}
          {viewMode === 'statistics' ? (
            <StatisticsView language={language} pieces={pieces} totalProgress={totalProgress} />
          ) : null}
          {viewMode === 'calendar' ? <CalendarView language={language} pieces={pieces} /> : null}
          {viewMode === 'settings' ? (
            <SettingsView
              appCopy={appCopy}
              fontSettings={fontSettings}
              fontNotice={fontNotice}
              language={language}
              migrationNotice={migrationNotice}
              selectedPiece={selectedPiece}
              onBackupNow={saveSnapshotNow}
              onCopyChange={setAppCopy}
              onExportMigration={exportMigrationFile}
              onFontNoticeChange={setFontNotice}
              onFontSettingsChange={setFontSettings}
              onRestoreBackup={restoreSnapshot}
              onSelectedPieceChange={updateSelectedPiece}
            />
          ) : null}
        </section>
      )}
      </section>
      {pendingViewMode ? (
        <div className="dock-log-modal" role="dialog" aria-modal="true">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              submitDockLog()
            }}
          >
            <span>{t.dockingQuestion}</span>
            <input
              aria-label="Docking log"
              autoFocus
              placeholder="over"
              value={dockLogDraft}
              onChange={(event) => setDockLogDraft(event.target.value)}
            />
            <button type="submit">{t.leave}</button>
          </form>
        </div>
      ) : null}
    </main>
  )
}

function NotesView({
  language,
  onTitleChange,
  pieces,
  selectedPieceId,
  onOpen,
}: {
  language: Language
  onTitleChange: (pieceId: string, title: string) => void
  pieces: Record<string, WritingPiece>
  selectedPieceId: string
  onOpen: (piece: WritingPiece) => void
}) {
  const t = uiText[language]
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const noteList = Object.values(pieces)
    .filter((piece) => piece.title.toLowerCase().includes(normalizedQuery))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  return (
    <>
      <div className="utility-heading">
        <span>{t.notesEyebrow}</span>
        <h1>{t.notesTitle}</h1>
      </div>
      <div className="notes-search">
        <label>
          {t.searchByTitle}
          <input
            aria-label={t.searchByTitle}
            placeholder={t.searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <span>{noteList.length} {t.notesCount}</span>
      </div>
      <div className="notes-grid">
        {noteList.map((piece) => {
          const stats = countWriting(piece.content)
          const zodiac = zodiacs.find((item) => item.id === piece.zodiacId)
          const updatedAt = new Date(piece.updatedAt).toLocaleString(
            language === 'zh' ? 'zh-CN' : 'en-US',
            {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            },
          )

          return (
            <article
              className={piece.id === selectedPieceId ? 'active' : ''}
              key={piece.id}
            >
              <small>{zodiac?.latin} · {piece.starId}</small>
              <input
                aria-label={`${piece.title} title`}
                value={piece.title}
                onChange={(event) => onTitleChange(piece.id, event.target.value)}
              />
              <span>{formatNumber(stats.effective)} / {formatNumber(piece.target)} {t.wordsUnit.toLowerCase()}</span>
              <time dateTime={piece.updatedAt}>{t.modified} {updatedAt}</time>
              <button type="button" onClick={() => onOpen(piece)}>
                {t.open}
              </button>
            </article>
          )
        })}
      </div>
    </>
  )
}

function WhiteboardsView({
  language,
  whiteboards,
  onWhiteboardsChange,
}: {
  language: Language
  whiteboards: Record<string, Whiteboard>
  onWhiteboardsChange: Dispatch<SetStateAction<Record<string, Whiteboard>>>
}) {
  const t = uiText[language]
  const boards = useMemo(
    () =>
      Object.values(whiteboards).sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      ),
    [whiteboards],
  )
  const [selectedBoardId, setSelectedBoardId] = useState(() => boards[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<WhiteboardMode>('select')
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [panning, setPanning] = useState(false)
  const [connectFromId, setConnectFromId] = useState<string | null>(null)
  const [draftStroke, setDraftStroke] = useState<WhiteboardStroke | null>(null)
  const boardSurfaceRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedBoard = whiteboards[selectedBoardId] ?? boards[0]
  const filteredBoards = boards.filter((board) =>
    board.title.toLowerCase().includes(search.toLowerCase()),
  )
  const boardNodes = selectedBoard?.nodes ?? []
  const boardEdges = selectedBoard?.edges ?? []
  const boardStrokes = selectedBoard?.strokes ?? []
  const boardImages = selectedBoard?.images ?? []

  useEffect(() => {
    if (!selectedBoard && boards[0]) {
      setSelectedBoardId(boards[0].id)
    }
  }, [boards, selectedBoard])

  function touchBoard(board: Whiteboard): Whiteboard {
    return { ...board, updatedAt: new Date().toISOString() }
  }

  function updateBoard(boardId: string, update: (board: Whiteboard) => Whiteboard) {
    onWhiteboardsChange((current) => {
      const board = current[boardId]
      if (!board) return current
      return { ...current, [boardId]: touchBoard(update(board)) }
    })
  }

  function pointDistanceToSegment(
    point: { x: number; y: number },
    start: { x: number; y: number },
    end: { x: number; y: number },
  ) {
    const dx = end.x - start.x
    const dy = end.y - start.y

    if (dx === 0 && dy === 0) {
      return Math.hypot(point.x - start.x, point.y - start.y)
    }

    const position = Math.max(
      0,
      Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)),
    )
    return Math.hypot(point.x - (start.x + position * dx), point.y - (start.y + position * dy))
  }

  function strokeNearPoint(stroke: WhiteboardStroke, point: { x: number; y: number }) {
    return stroke.points
      .slice(1)
      .some((current, index) => pointDistanceToSegment(point, stroke.points[index], current) < 18)
  }

  function eraseAt(point: { x: number; y: number }) {
    if (!selectedBoard) return
    updateBoard(selectedBoard.id, (board) => ({
      ...board,
      strokes: board.strokes.filter((stroke) => !strokeNearPoint(stroke, point)),
    }))
  }

  function deleteNode(nodeId: string) {
    if (!selectedBoard) return
    const confirmed = window.confirm(
      language === 'zh' ? '确认删除这个圆点吗？相关连线也会删除。' : 'Delete this point? Related lines will also be removed.',
    )

    if (!confirmed) return

    updateBoard(selectedBoard.id, (board) => ({
      ...board,
      nodes: board.nodes.filter((node) => node.id !== nodeId),
      edges: board.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId),
    }))
  }

  function undoWhiteboardStep() {
    if (!selectedBoard) return
    updateBoard(selectedBoard.id, (board) => {
      if (board.strokes.length > 0) {
        return { ...board, strokes: board.strokes.slice(0, -1) }
      }
      if (board.images.length > 0) {
        return { ...board, images: board.images.slice(0, -1) }
      }
      if (board.edges.length > 0) {
        return { ...board, edges: board.edges.slice(0, -1) }
      }
      if (board.nodes.length > 0) {
        const lastNode = board.nodes[board.nodes.length - 1]
        return {
          ...board,
          nodes: board.nodes.slice(0, -1),
          edges: board.edges.filter((edge) => edge.from !== lastNode.id && edge.to !== lastNode.id),
        }
      }
      return board
    })
  }

  function createBoard() {
    const board = createInitialWhiteboard()
    board.title = language === 'zh' ? '新白板' : 'New Whiteboard'
    onWhiteboardsChange((current) => ({ ...current, [board.id]: board }))
    setSelectedBoardId(board.id)
  }

  function deleteBoard(boardId: string) {
    onWhiteboardsChange((current) => {
      const next = { ...current }
      delete next[boardId]
      if (Object.keys(next).length === 0) {
        const board = createInitialWhiteboard()
        board.title = language === 'zh' ? '新白板' : 'New Whiteboard'
        setSelectedBoardId(board.id)
        return { [board.id]: board }
      }
      const [nextBoard] = Object.values(next).sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      )
      setSelectedBoardId(nextBoard.id)
      return next
    })
  }

  function canvasPoint(event: PointerEvent<HTMLElement>) {
    const rect = boardSurfaceRef.current?.getBoundingClientRect()
    return {
      x: event.clientX - (rect?.left ?? 0) - pan.x,
      y: event.clientY - (rect?.top ?? 0) - pan.y,
    }
  }

  function handleSurfacePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!selectedBoard) return
    if (mode === 'node') {
      const point = canvasPoint(event)
      updateBoard(selectedBoard.id, (board) => ({
        ...board,
        nodes: [...board.nodes, { id: createId('node'), x: point.x, y: point.y, text: t.pointText }],
      }))
      return
    }
    if (mode === 'draw') {
      setDraftStroke({
        id: createId('stroke'),
        points: [canvasPoint(event)],
        color: '#e4b46e',
        width: 3,
      })
      return
    }
    if (mode === 'erase') {
      eraseAt(canvasPoint(event))
      return
    }
    setPanning(true)
  }

  function handleSurfacePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!selectedBoard) return
    if (draggingNodeId) {
      const point = canvasPoint(event)
      updateBoard(selectedBoard.id, (board) => ({
        ...board,
        nodes: board.nodes.map((node) =>
          node.id === draggingNodeId ? { ...node, x: point.x, y: point.y } : node,
        ),
      }))
      return
    }
    if (draftStroke) {
      setDraftStroke({ ...draftStroke, points: [...draftStroke.points, canvasPoint(event)] })
      return
    }
    if (mode === 'erase') {
      eraseAt(canvasPoint(event))
      return
    }
    if (panning) {
      setPan((current) => ({ x: current.x + event.movementX, y: current.y + event.movementY }))
    }
  }

  function handleSurfacePointerUp() {
    if (selectedBoard && draftStroke && draftStroke.points.length > 1) {
      updateBoard(selectedBoard.id, (board) => ({
        ...board,
        strokes: [...board.strokes, draftStroke],
      }))
    }
    setDraggingNodeId(null)
    setPanning(false)
    setDraftStroke(null)
  }

  function handleNodePointerDown(event: PointerEvent<HTMLDivElement>, nodeId: string) {
    event.stopPropagation()
    if (!selectedBoard) return
    if (mode === 'connect') {
      if (!connectFromId) {
        setConnectFromId(nodeId)
        return
      }
      if (connectFromId !== nodeId) {
        updateBoard(selectedBoard.id, (board) => ({
          ...board,
          edges: [
            ...board.edges,
            { id: createId('edge'), from: connectFromId, to: nodeId, label: t.lineText },
          ],
        }))
      }
      setConnectFromId(null)
      return
    }
    setDraggingNodeId(nodeId)
  }

  function updateNodeText(nodeId: string, text: string) {
    if (!selectedBoard) return
    updateBoard(selectedBoard.id, (board) => ({
      ...board,
      nodes: board.nodes.map((node) => (node.id === nodeId ? { ...node, text } : node)),
    }))
  }

  function updateEdgeLabel(edgeId: string, label: string) {
    if (!selectedBoard) return
    updateBoard(selectedBoard.id, (board) => ({
      ...board,
      edges: board.edges.map((edge) => (edge.id === edgeId ? { ...edge, label } : edge)),
    }))
  }

  function importSketch(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !selectedBoard) return
    const reader = new FileReader()
    reader.onload = () => {
      updateBoard(selectedBoard.id, (board) => ({
        ...board,
        images: [
          ...board.images,
          {
            id: createId('image'),
            x: 260,
            y: 180,
            width: 460,
            height: 300,
            dataUrl: String(reader.result),
          },
        ],
      }))
    }
    reader.readAsDataURL(file)
  }

  async function exportBoardPdf() {
    if (!selectedBoard) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setFillColor(7, 19, 29)
    doc.rect(0, 0, pageWidth, pageHeight, 'F')
    doc.setTextColor(228, 180, 110)
    doc.setFontSize(22)
    doc.text(selectedBoard.title, 32, 38)

    const allX = [
      ...selectedBoard.nodes.map((node) => node.x),
      ...selectedBoard.images.map((image) => image.x + image.width),
      ...selectedBoard.strokes.flatMap((stroke) => stroke.points.map((point) => point.x)),
    ]
    const allY = [
      ...selectedBoard.nodes.map((node) => node.y),
      ...selectedBoard.images.map((image) => image.y + image.height),
      ...selectedBoard.strokes.flatMap((stroke) => stroke.points.map((point) => point.y)),
    ]
    const minX = Math.min(0, ...allX) - 80
    const minY = Math.min(0, ...allY) - 80
    const maxX = Math.max(900, ...allX) + 160
    const maxY = Math.max(620, ...allY) + 160
    const scale = Math.min((pageWidth - 64) / (maxX - minX), (pageHeight - 90) / (maxY - minY))
    const tx = (x: number) => 32 + (x - minX) * scale
    const ty = (y: number) => 64 + (y - minY) * scale

    selectedBoard.images.forEach((image) => {
      doc.addImage(image.dataUrl, tx(image.x), ty(image.y), image.width * scale, image.height * scale)
    })
    doc.setDrawColor(184, 220, 255)
    doc.setLineWidth(1)
    selectedBoard.edges.forEach((edge) => {
      const from = selectedBoard.nodes.find((node) => node.id === edge.from)
      const to = selectedBoard.nodes.find((node) => node.id === edge.to)
      if (!from || !to) return
      doc.line(tx(from.x), ty(from.y), tx(to.x), ty(to.y))
      doc.setTextColor(234, 223, 203)
      doc.setFontSize(9)
      doc.text(edge.label, tx((from.x + to.x) / 2), ty((from.y + to.y) / 2))
    })
    doc.setDrawColor(228, 180, 110)
    selectedBoard.strokes.forEach((stroke) => {
      doc.setLineWidth(stroke.width * scale)
      stroke.points.slice(1).forEach((point, index) => {
        const previous = stroke.points[index]
        doc.line(tx(previous.x), ty(previous.y), tx(point.x), ty(point.y))
      })
    })
    selectedBoard.nodes.forEach((node) => {
      doc.setFillColor(232, 220, 199)
      doc.circle(tx(node.x), ty(node.y), 5, 'F')
      doc.setTextColor(234, 223, 203)
      doc.setFontSize(10)
      doc.text(node.text, tx(node.x) + 10, ty(node.y) - 8)
    })
    const filename = `${safeMarkdownFilename(selectedBoard.title).replace(/\.md$/i, '')}.pdf`
    const bridge = obsidianBridge()

    if (bridge) {
      await bridge.savePdfFile({
        filename,
        contentsBase64: arrayBufferToBase64(doc.output('arraybuffer')),
      })
      return
    }

    doc.save(filename)
  }

  async function openObsidianCanvas() {
    if (!selectedBoard) return
    const bridge = obsidianBridge()

    if (!bridge) {
      return
    }

    await bridge.openCanvasFile({
      id: selectedBoard.id,
      title: selectedBoard.title,
      contents: obsidianCanvasForWhiteboard(selectedBoard),
    })
  }

  return (
    <>
      <div className="utility-heading whiteboard-heading">
        <span>{t.whiteboardsEyebrow}</span>
        <h1>{t.whiteboardsTitle}</h1>
        <button type="button" onClick={createBoard}>
          {t.newWhiteboard}
        </button>
        <button type="button" onClick={openObsidianCanvas}>
          {language === 'zh' ? '打开 Obsidian 白板' : 'Open Obsidian Canvas'}
        </button>
      </div>
      <div className="whiteboard-shell">
        <aside className="whiteboard-list">
          <label>
            {t.searchWhiteboards}
            <input
              value={search}
              placeholder={t.whiteboardPlaceholder}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {filteredBoards.length > 0 ? (
            filteredBoards.map((board) => (
              <article className={board.id === selectedBoard?.id ? 'active' : ''} key={board.id}>
                <input
                  value={board.title}
                  onChange={(event) =>
                    updateBoard(board.id, (current) => ({ ...current, title: event.target.value }))
                  }
                />
                <time>{new Date(board.updatedAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}</time>
                <div>
                  <button type="button" onClick={() => setSelectedBoardId(board.id)}>
                    {t.open}
                  </button>
                  <button type="button" onClick={() => deleteBoard(board.id)}>
                    {t.deleteWhiteboard}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p>{t.noWhiteboards}</p>
          )}
        </aside>
        <section className="whiteboard-workspace">
          <div className="whiteboard-toolbar">
            {(['select', 'node', 'connect', 'draw', 'erase'] as WhiteboardMode[]).map((item) => (
              <button
                className={mode === item ? 'active' : ''}
                key={item}
                type="button"
                onClick={() => setMode(item)}
              >
                {item === 'select'
                  ? t.moveCanvas
                  : item === 'node'
                    ? t.addPoint
                    : item === 'connect'
                      ? t.connectPoints
                      : item === 'draw'
                        ? t.handDraw
                        : t.eraseDrawings}
              </button>
            ))}
            <button type="button" onClick={undoWhiteboardStep}>
              {t.undoWhiteboard}
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              {t.importSketch}
            </button>
            <button type="button" onClick={exportBoardPdf}>
              {t.exportPdf}
            </button>
            <input
              accept="image/png,image/jpeg"
              hidden
              ref={fileInputRef}
              type="file"
              onChange={importSketch}
            />
          </div>
          <div
            className={`whiteboard-canvas mode-${mode}`}
            ref={boardSurfaceRef}
            onPointerDown={handleSurfacePointerDown}
            onPointerMove={handleSurfacePointerMove}
            onPointerUp={handleSurfacePointerUp}
            onPointerLeave={handleSurfacePointerUp}
          >
            <div className="whiteboard-stage" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
              {boardImages.map((image) => (
                <img
                  alt=""
                  className="whiteboard-image"
                  key={image.id}
                  src={image.dataUrl}
                  style={{ left: image.x, top: image.y, width: image.width, height: image.height }}
                />
              ))}
              <svg className="whiteboard-lines" viewBox="0 0 2400 1600">
                {boardEdges.map((edge) => {
                  const from = boardNodes.find((node) => node.id === edge.from)
                  const to = boardNodes.find((node) => node.id === edge.to)
                  if (!from || !to) return null
                  return <line key={edge.id} x1={from.x} x2={to.x} y1={from.y} y2={to.y} />
                })}
                {[...boardStrokes, ...(draftStroke ? [draftStroke] : [])].map((stroke) => (
                  <polyline
                    key={stroke.id}
                    points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}
                  />
                ))}
              </svg>
              {boardEdges.map((edge) => {
                const from = boardNodes.find((node) => node.id === edge.from)
                const to = boardNodes.find((node) => node.id === edge.to)
                if (!from || !to) return null
                return (
                  <input
                    className="edge-label"
                    key={edge.id}
                    style={{ left: (from.x + to.x) / 2, top: (from.y + to.y) / 2 }}
                    value={edge.label}
                    onPointerDown={(event) => event.stopPropagation()}
                    onChange={(event) => updateEdgeLabel(edge.id, event.target.value)}
                  />
                )
              })}
              {boardNodes.map((node) => (
                <div
                  className={`whiteboard-node ${connectFromId === node.id ? 'connecting' : ''}`}
                  key={node.id}
                  style={{ left: node.x, top: node.y }}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    deleteNode(node.id)
                  }}
                  onPointerDown={(event) => handleNodePointerDown(event, node.id)}
                >
                  <span />
                  <textarea
                    value={node.text}
                    onPointerDown={(event) => {
                      if (mode !== 'connect') {
                        event.stopPropagation()
                      }
                    }}
                    onChange={(event) => updateNodeText(node.id, event.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

function StatisticsView({
  language,
  pieces,
  totalProgress,
}: {
  language: Language
  pieces: Record<string, WritingPiece>
  totalProgress: { lit: number; total: number; percent: number }
}) {
  const t = uiText[language]
  const allPieces = Object.values(pieces)
  const totalWords = allPieces.reduce(
    (sum, piece) => sum + countWriting(piece.content).effective,
    0,
  )
  const activeNotes = allPieces.filter((piece) => piece.content.trim()).length

  return (
    <>
      <div className="utility-heading">
        <span>{t.statsEyebrow}</span>
        <h1>{t.statsTitle}</h1>
      </div>
      <div className="stat-grid">
        <article>
          <span>{t.totalWords}</span>
          <strong>{formatNumber(totalWords)}</strong>
        </article>
        <article>
          <span>{t.litStars}</span>
          <strong>{totalProgress.lit}/{totalProgress.total}</strong>
        </article>
        <article>
          <span>{t.completion}</span>
          <strong>{totalProgress.percent}%</strong>
        </article>
        <article>
          <span>{t.activeNotes}</span>
          <strong>{activeNotes}</strong>
        </article>
      </div>
    </>
  )
}

function CalendarView({
  language,
  pieces,
}: {
  language: Language
  pieces: Record<string, WritingPiece>
}) {
  const t = uiText[language]
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const monthName = today.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'long',
    year: 'numeric',
  })
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = (firstDay.getDay() + 6) % 7
  const totalWords = Object.values(pieces).reduce(
    (sum, piece) => sum + countWriting(piece.content).effective,
    0,
  )
  const litZodiacIdsToday = Array.from(
    new Set(
      Object.values(pieces)
        .filter((piece) => countWriting(piece.content).effective >= piece.target)
        .map((piece) => piece.zodiacId),
    ),
  )
  const dailyWords = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const wave = ((day * 37 + totalWords) % 210) + 40

    if (day > today.getDate()) {
      return 0
    }

    if (day === today.getDate()) {
      return totalWords
    }

    return day % 4 === 0 || day % 7 === 0 ? 0 : wave
  })
  const calendarCells = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...dailyWords.map((words, index) => ({
      day: index + 1,
      words,
      badges: index + 1 === today.getDate() ? litZodiacIdsToday : [],
    })),
  ]

  return (
    <>
      <div className="utility-heading">
        <span>{t.calendarEyebrow}</span>
        <h1>{monthName} {t.calendarTitleSuffix}</h1>
      </div>
      <div className="calendar-month">
        {(language === 'zh'
          ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
          : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        ).map((day) => (
          <strong className="weekday" key={day}>
            {day}
          </strong>
        ))}
        {calendarCells.map((cell, index) =>
          cell ? (
            <article
              className={cell.words > 0 ? 'wrote' : ''}
              key={`${cell.day}-${index}`}
            >
              <span>{cell.day}</span>
              {cell.badges.length > 0 ? (
                <div className="calendar-badges" aria-label="Lit zodiac badges">
                  {cell.badges.map((zodiacId) => {
                    const zodiac = zodiacs.find((item) => item.id === zodiacId)

                    return zodiac ? (
                      <b key={zodiacId} title={`${language === 'zh' ? zodiac.name : zodiac.latin} ${t.lit}`}>
                        {textSymbol(zodiac.symbol)}
                      </b>
                    ) : null
                  })}
                </div>
              ) : null}
              <strong>{formatNumber(cell.words)}</strong>
              <small>{t.calendarWords}</small>
            </article>
          ) : (
            <i aria-hidden="true" key={`blank-${index}`} />
          ),
        )}
      </div>
    </>
  )
}

function SettingsView({
  appCopy,
  fontSettings,
  fontNotice,
  language,
  migrationNotice,
  selectedPiece,
  onBackupNow,
  onCopyChange,
  onExportMigration,
  onFontNoticeChange,
  onFontSettingsChange,
  onRestoreBackup,
  onSelectedPieceChange,
}: {
  appCopy: AppCopy
  fontSettings: FontSettings
  fontNotice: string
  language: Language
  migrationNotice: string
  selectedPiece: WritingPiece
  onBackupNow: () => void
  onCopyChange: Dispatch<SetStateAction<AppCopy>>
  onExportMigration: () => void
  onFontNoticeChange: Dispatch<SetStateAction<string>>
  onFontSettingsChange: Dispatch<SetStateAction<FontSettings>>
  onRestoreBackup: () => void
  onSelectedPieceChange: (update: Partial<WritingPiece>) => void
}) {
  const t = uiText[language]
  const zhOptions = [
    ...zhFontPresets,
    ...fontSettings.zhImports.map((font) => ({
      label: font.label,
      value: `"${font.family}"`,
    })),
  ]
  const enOptions = [
    ...enFontPresets,
    ...fontSettings.enImports.map((font) => ({
      label: font.label,
      value: `"${font.family}"`,
    })),
  ]

  function fontValue(font: FontImport) {
    return `"${font.family}"`
  }

  async function removeFont(kind: 'zh' | 'en', font: FontImport) {
    const value = fontValue(font)

    try {
      if (font.storageKey) {
        await deleteImportedFont(font.storageKey)
      }
    } catch (error) {
      console.warn('Unable to delete imported font file', error)
    }

    onFontSettingsChange((current) => {
      if (kind === 'zh') {
        return {
          ...current,
          zhFont: current.zhFont === value ? defaultFontSettings.zhFont : current.zhFont,
          zhImports: current.zhImports.filter((item) => item.family !== font.family),
        }
      }

      return {
        ...current,
        enFont: current.enFont === value ? defaultFontSettings.enFont : current.enFont,
        enImports: current.enImports.filter((item) => item.family !== font.family),
      }
    })
    onFontNoticeChange(t.fontDeleted)
  }

  function activateImportedFont(kind: 'zh' | 'en', font: FontImport) {
    const value = fontValue(font)

    onFontSettingsChange((current) => ({
      ...current,
      ...(kind === 'zh' ? { zhFont: value } : { enFont: value }),
    }))
    onFontNoticeChange('')
  }

  async function importFont(event: ChangeEvent<HTMLInputElement>, kind: 'zh' | 'en') {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    onFontNoticeChange('')

    try {
      const family = `Stellaris-${kind}-${Date.now()}`
      const storageKey = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2)}`

      await saveImportedFont(storageKey, file)

      const font = {
        label: file.name.replace(/\.[^.]+$/, ''),
        family,
        storageKey,
      }

      onFontSettingsChange((current) => ({
        ...current,
        ...(kind === 'zh'
          ? { zhFont: `"${family}"`, zhImports: [...current.zhImports, font] }
          : { enFont: `"${family}"`, enImports: [...current.enImports, font] }),
      }))
      onFontNoticeChange(t.fontImported)
    } catch (error) {
      console.warn('Unable to import font', error)
      onFontNoticeChange(t.fontImportFailed)
    }
  }

  return (
    <>
      <div className="utility-heading">
        <span>{t.settingsEyebrow}</span>
        <h1>{t.settingsTitle}</h1>
      </div>
      <div className="settings-panel">
        <label>
          {t.noteTarget}
          <input
            min="100"
            step="100"
            type="number"
            value={selectedPiece.target}
            onChange={(event) =>
              onSelectedPieceChange({ target: Number(event.target.value) })
            }
          />
        </label>
        <label>
          {t.leftQuote}
          <textarea
            value={appCopy.quote}
            onChange={(event) =>
              onCopyChange((current) => ({
                ...current,
                quote: event.target.value,
              }))
            }
          />
        </label>
        <label>
          {t.leftQuoteAuthor}
          <input
            value={appCopy.author}
            onChange={(event) =>
              onCopyChange((current) => ({
                ...current,
                author: event.target.value,
              }))
            }
          />
        </label>
        <div className="settings-divider">
          <span>{t.migrationTitle}</span>
        </div>
        <div className="migration-actions">
          <button type="button" onClick={onBackupNow}>
            {t.backupNow}
          </button>
          <button type="button" onClick={onRestoreBackup}>
            {t.restoreBackup}
          </button>
          <button type="button" onClick={onExportMigration}>
            {t.exportMigration}
          </button>
        </div>
        {migrationNotice ? <p className="settings-note">{migrationNotice}</p> : null}
        <div className="settings-divider">
          <span>{t.typographyTitle}</span>
        </div>
        <label>
          {t.chineseFont}
          <select
            value={fontSettings.zhFont}
            onChange={(event) =>
              onFontSettingsChange((current) => ({
                ...current,
                zhFont: event.target.value,
              }))
            }
          >
            {zhOptions.map((font) => (
              <option key={fontOptionKey(font.value)} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.englishFont}
          <select
            value={fontSettings.enFont}
            onChange={(event) =>
              onFontSettingsChange((current) => ({
                ...current,
                enFont: event.target.value,
              }))
            }
          >
            {enOptions.map((font) => (
              <option key={fontOptionKey(font.value)} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </label>
        <div className="font-import-row">
          <label>
            {t.importChineseFont}
            <input
              accept=".otf,.ttc,.ttf,.woff,.woff2,font/*"
              type="file"
              onChange={(event) => importFont(event, 'zh')}
            />
          </label>
          <label>
            {t.importEnglishFont}
            <input
              accept=".otf,.ttc,.ttf,.woff,.woff2,font/*"
              type="file"
              onChange={(event) => importFont(event, 'en')}
            />
          </label>
        </div>
        <div className="imported-fonts-panel">
          <span>{t.importedFonts}</span>
          {fontSettings.zhImports.length + fontSettings.enImports.length > 0 ? (
            <div className="imported-fonts-list">
              {fontSettings.zhImports.map((font) => {
                const active = fontSettings.zhFont === fontValue(font)

                return (
                  <article key={font.family}>
                    <div>
                      <strong>{font.label}</strong>
                      <small>{t.chineseFont}</small>
                    </div>
                    <div className="imported-font-actions">
                      <button
                        type="button"
                        disabled={active}
                        onClick={() => activateImportedFont('zh', font)}
                      >
                        {active ? t.activeFont : t.useFont}
                      </button>
                      <button type="button" onClick={() => removeFont('zh', font)}>
                        {t.deleteFont}
                      </button>
                    </div>
                  </article>
                )
              })}
              {fontSettings.enImports.map((font) => {
                const active = fontSettings.enFont === fontValue(font)

                return (
                  <article key={font.family}>
                    <div>
                      <strong>{font.label}</strong>
                      <small>{t.englishFont}</small>
                    </div>
                    <div className="imported-font-actions">
                      <button
                        type="button"
                        disabled={active}
                        onClick={() => activateImportedFont('en', font)}
                      >
                        {active ? t.activeFont : t.useFont}
                      </button>
                      <button type="button" onClick={() => removeFont('en', font)}>
                        {t.deleteFont}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <p>{t.noImportedFonts}</p>
          )}
        </div>
        {fontNotice ? <p className="settings-note">{fontNotice}</p> : null}
      </div>
    </>
  )
}

export default App
