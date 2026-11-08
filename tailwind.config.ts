import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: '#3B4FDE',
        'accent-hover': '#2d3fb5',
        'text-primary': '#111827',
        'text-secondary': '#6B7280',
        'bg-page': '#F3F4F6',
        'bg-card': '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08)',
      },
      minWidth: {
        '1024': '1024px',
      },
    },
  },
  plugins: [],
}

export default config

