import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#f4faf5',
          100: '#e6f4e8',
          200: '#cbe7d0',
          300: '#a3d3ac',
          400: '#75b783',
          500: '#52a062',
          600: '#3f854c',
          700: '#346a3f',
          800: '#2c5535',
          900: '#26462d'
        },
        bamboo: {
          50: '#f6faf3',
          100: '#e9f3e1',
          200: '#d2e6c2',
          300: '#a8cf8e',
          400: '#7eb45f',
          500: '#5f9942',
          600: '#487a32'
        },
        cream: '#fbfdf7'
      },
      fontFamily: {
        display: ['"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 6px 24px -10px rgba(82,160,98,0.25)'
      }
    }
  },
  plugins: []
};

export default config;
