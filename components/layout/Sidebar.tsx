'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FileText,
  Users,
} from 'lucide-react'

const navItems = [
  { href: '/notebook', label: 'Блокнот', icon: FileText },
  { href: '/people', label: 'Окружение', icon: Users },
]

export default function Sidebar() {
  const pathname = usePathname()

  const handleOpenAI = () => {
    window.dispatchEvent(new CustomEvent('open-aki-ai'))
  }

  return (
    <aside className="w-[220px] min-w-[220px] h-screen bg-white border-r border-slate-100 flex flex-col sticky top-0 z-20 select-none">
      {/* Логотип */}
      <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
        <Link href="/notebook" className="flex items-center gap-2 group">
          <span className="text-xl font-bold tracking-tight text-slate-900">aki</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
        </Link>
      </div>

      {/* Навигация */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded-xl
                text-xs font-medium transition-all
                ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }
              `}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{label}</span>
            </Link>
          )
        })}

        {/* Кнопка вызова aki AI */}
        <div className="pt-3 mt-3 border-t border-slate-100">
          <button
            onClick={handleOpenAI}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all"
          >
            <div className="flex items-center gap-2">
              <img src="/photo/aki.webp" alt="aki" className="w-4 h-4 rounded-full object-cover" />
              <span>aki AI</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">⌘J</span>
          </button>
        </div>
      </nav>

      {/* Профиль внизу */}
      <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/photo/srk.webp" alt="srk" className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200" />
          <span className="text-xs font-medium text-slate-700">Серик</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">v0.2</span>
      </div>
    </aside>
  )
}
