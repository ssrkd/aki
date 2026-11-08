'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CheckSquare,
  Target,
  DollarSign,
  BookOpen,
  ClipboardList,
  Trophy,
  FileText,
  Sparkles,
} from 'lucide-react'

const navItems = [
  { href: '/habits', label: 'Привычки', icon: CheckSquare },
  { href: '/goals', label: 'Цели', icon: Target },
  { href: '/finances', label: 'Финансы', icon: DollarSign },
  { href: '/books', label: 'Книги', icon: BookOpen },
  { href: '/plans', label: 'Планы', icon: ClipboardList },
  { href: '/achievements', label: 'Достижения', icon: Trophy },
  { href: '/notebook', label: 'Блокнот', icon: FileText },
]

export default function Sidebar() {
  const pathname = usePathname()

  const handleOpenAI = () => {
    window.dispatchEvent(new CustomEvent('open-aki-ai'))
  }

  return (
    <aside className="w-[240px] min-w-[240px] h-screen bg-white border-r border-gray-100 shadow-sm flex flex-col sticky top-0 z-20">
      {/* Логотип */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <Link href="/habits" className="flex items-center gap-2 group">
          <span className="text-2xl font-bold text-[#111827] tracking-tight group-hover:text-[#3B4FDE] transition-colors">aki</span>
          <span className="w-2 h-2 rounded-full bg-[#3B4FDE] animate-pulse" />
        </Link>
      </div>

      {/* Навигация */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl
                text-sm font-medium
                transition-all duration-150
                ${
                  isActive
                    ? 'bg-[#3B4FDE] text-white shadow-sm shadow-indigo-500/20'
                    : 'text-[#6B7280] hover:bg-slate-50 hover:text-[#111827]'
                }
              `}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          )
        })}

        {/* Разделитель и кнопка aki AI */}
        <div className="pt-3 mt-3 border-t border-slate-100">
          <button
            onClick={handleOpenAI}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-[#3B4FDE] bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 border border-indigo-100 transition-all shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles size={18} className="text-[#3B4FDE]" />
              <span>aki AI</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#3B4FDE] text-white">PRO</span>
          </button>
        </div>
      </nav>

      {/* Версия / профиль внизу */}
      <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/photo/srk.webp" alt="srk" className="w-6 h-6 rounded-full object-cover" />
          <span className="text-xs font-semibold text-slate-700">srk</span>
        </div>
        <p className="text-[11px] text-[#94a3b8]">aki v0.2</p>
      </div>
    </aside>
  )
}
