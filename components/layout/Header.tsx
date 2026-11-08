'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, LogOut, Sparkles, RefreshCw, Bot, Shield, CheckCircle2 } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  onOpenAI?: () => void
}

export default function Header({ title, subtitle, onOpenAI }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Закрытие дропдауна при клике вне его
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

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <header className="h-16 bg-white border-b border-gray-100 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Заголовок страницы */}
      <div>
        <h1 className="text-lg font-semibold text-[#111827]">{title}</h1>
        {subtitle && <p className="text-xs text-[#6B7280]">{subtitle}</p>}
      </div>

      {/* Поиск, кнопка aki AI и аватарка с меню настроек */}
      <div className="flex items-center gap-3">
        {/* Кнопка вызова aki AI */}
        <button
          onClick={() => {
            if (onOpenAI) onOpenAI()
            else window.dispatchEvent(new CustomEvent('open-aki-ai'))
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 text-[#3B4FDE] hover:shadow-sm hover:border-indigo-200 text-xs font-semibold transition-all"
        >
          <Sparkles size={14} className="text-[#3B4FDE]" />
          <span>aki AI</span>
        </button>

        {/* Поле поиска */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
          />
          <input
            type="text"
            placeholder="Поиск..."
            className="
              pl-9 pr-4 py-1.5 rounded-lg border border-gray-200
              text-sm text-[#111827] placeholder:text-[#6B7280]
              bg-[#F3F4F6] focus:bg-white
              focus:outline-none focus:ring-2 focus:ring-[#3B4FDE] focus:border-transparent
              transition-all duration-200 w-44 sm:w-52
            "
          />
        </div>

        {/* Круглая аватарка пользователя (photo/srk.webp) с меню настроек */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative flex items-center justify-center rounded-full p-0.5 hover:ring-2 hover:ring-[#3B4FDE]/40 transition-all focus:outline-none"
            title="Меню профиля и настроек"
          >
            <img
              src="/photo/srk.webp"
              alt="srk"
              className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-slate-200"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
          </button>

          {/* Выпадающее меню настроек */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              {/* Профиль */}
              <div className="px-4 py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/photo/srk.webp"
                    alt="srk"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-800">Серик (srk)</p>
                    <p className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 size={11} /> В сети • aki online
                    </p>
                  </div>
                </div>
              </div>

              {/* Пункты меню */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    window.dispatchEvent(new CustomEvent('open-aki-ai'))
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                >
                  <Sparkles size={14} className="text-[#3B4FDE]" />
                  <span>Открыть aki AI</span>
                </button>

                <a
                  href="https://t.me/srkandaki_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                >
                  <Bot size={14} className="text-blue-500" />
                  <span>Telegram бот (@srkandaki_bot)</span>
                </a>

                <button
                  onClick={handleRefresh}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                >
                  <RefreshCw size={14} className="text-slate-500" />
                  <span>Обновить данные</span>
                </button>
              </div>

              {/* Разделитель и кнопка выхода */}
              <div className="border-t border-slate-100 pt-1 mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors font-medium"
                >
                  <LogOut size={14} />
                  <span>Выйти из аккаунта</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
