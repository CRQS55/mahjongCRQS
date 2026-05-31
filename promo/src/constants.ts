export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const SCENES = [
  { id: 'hook',         from: 0,    duration: 90  }, // 0-3s
  { id: 'productIntro', from: 90,   duration: 120 }, // 3-7s   ← URL pill needs room
  { id: 'input',        from: 210,  duration: 90  }, // 7-10s
  { id: 'tenpai',       from: 300,  duration: 150 }, // 10-15s
  { id: 'top6',         from: 450,  duration: 210 }, // 15-22s
  { id: 'aiCoach',      from: 660,  duration: 270 }, // 22-31s ★ AI 教练
  { id: 'visibleTiles', from: 930,  duration: 150 }, // 31-36s
  { id: 'strategy',     from: 1080, duration: 180 }, // 36-42s
  { id: 'scoring',      from: 1260, duration: 150 }, // 42-47s
  { id: 'quiz',         from: 1410, duration: 180 }, // 47-53s
  { id: 'end',          from: 1590, duration: 210 }, // 53-60s
] as const;

export const TOTAL_FRAMES = 1800;

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
