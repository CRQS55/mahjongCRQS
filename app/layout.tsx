import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '川麻小助手 · 四川麻将自动计算器',
  description: '拍照识牌 · 听牌分析 · 出牌建议（小清新绿）'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
