'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, RefreshCw, Bot, CheckCircle2 } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  onOpenAI?: () => void
}

export default function Header({ title, subtitle, onOpenAI }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/login')
    }
  }

  return (
    <header className="h-14 bg-white border-b border-slate-100 px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Заголовок страницы */}
      <div>
        <h1 className="text-sm font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
      </div>

      {/* Правая часть: кнопка aki AI и аватарка */}
      <div className="flex items-center gap-3">
        {/* Кнопка aki AI */}
        <button
          onClick={() => {
            if (onOpenAI) onOpenAI()
            else window.dispatchEvent(new CustomEvent('open-aki-ai'))
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-all"
        >
          <img src="/photo/aki.webp" alt="aki" className="w-3.5 h-3.5 rounded-full object-cover" />
          <span>aki AI</span>
        </button>

        {/* Круглая аватарка пользователя (photo/srk.webp) с меню настроек */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative flex items-center justify-center rounded-full p-0.5 hover:ring-2 hover:ring-slate-900/10 transition-all focus:outline-none"
            title="Меню профиля и настроек"
          >
            <img
              src="/photo/srk.webp"
              alt="srk"
              className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs"
            />
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-white rounded-full" />
          </button>

          {/* Выпадающее меню настроек */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">Серик</p>
                <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={10} /> в сети
                </p>
              </div>

              <div className="py-1 text-xs">
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    window.dispatchEvent(new CustomEvent('open-aki-ai'))
                  }}
                  className="w-full px-3.5 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                >
                  <img src="/photo/aki.webp" alt="aki" className="w-3.5 h-3.5 rounded-full object-cover" />
                  <span>Открыть aki AI</span>
                </button>

                <a
                  href="https://t.me/srkandaki_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-3.5 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                >
                  <Bot size={13} className="text-slate-500" />
                  <span>Telegram бот</span>
                </a>

                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-3.5 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                >
                  <RefreshCw size={13} className="text-slate-500" />
                  <span>Обновить сайт</span>
                </button>
              </div>

              <div className="border-t border-slate-100 pt-1 mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full px-3.5 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-medium"
                >
                  <LogOut size={13} />
                  <span>Выйти</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
