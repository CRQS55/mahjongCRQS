export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const SCENES = [
  { id: 'hook',         from: 0,    duration: 90  }, // 0-3s
  { id: 'productIntro', from: 90,   duration: 120 }, // 3-7s
  { id: 'scan',         from: 210,  duration: 150 }, // 7-12s
  { id: 'tenpai',       from: 360,  duration: 180 }, // 12-18s
  { id: 'top6',         from: 540,  duration: 240 }, // 18-26s
  { id: 'value',        from: 780,  duration: 180 }, // 26-32s
  { id: 'visibleTiles', from: 960,  duration: 180 }, // 32-38s
  { id: 'strategy',     from: 1140, duration: 210 }, // 38-45s
  { id: 'scoring',      from: 1350, duration: 180 }, // 45-51s
  { id: 'quiz',         from: 1530, duration: 150 }, // 51-56s
  { id: 'end',          from: 1680, duration: 210 }, // 56-63s — extended so voice-11 finishes
] as const;

export const TOTAL_FRAMES = 1890;

export const COLORS = {
  bgCream: '#fbfdf7',
  sage50:  '#f4faf5',
  sage100: '#e6f4e8',
  sage200: '#cbe7d0',
  sage300: '#a3d3ac',
  sage400: '#75b783',
  sage500: '#52a062',
  sage600: '#3f854c',
  sage700: '#346a3f',
  sage800: '#2c5535',
  sage900: '#26462d',
  gold:    '#f5c451',
  goldDeep:'#d99a2b',
  ink:     '#1c2a20',
  white:   '#ffffff',
  shadow:  'rgba(82,160,98,0.25)',
} as const;

export const FONT_FAMILY =
  '"PingFang SC","Microsoft YaHei","Hiragino Sans GB",system-ui,sans-serif';
