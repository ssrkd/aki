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

  return (
    <aside className="w-[240px] min-w-[240px] h-screen bg-white border-r border-gray-100 shadow-sm flex flex-col sticky top-0">
      {/* Логотип */}
      <div className="px-6 py-5 border-b border-gray-100">
        <span className="text-2xl font-bold text-[#111827] tracking-tight">aki</span>
      </div>

      {/* Навигация */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg
                text-sm font-medium
                transition-all duration-200
                ${
                  isActive
                    ? 'bg-[#3B4FDE] text-white shadow-sm'
                    : 'text-[#6B7280] hover:bg-gray-50 hover:text-[#111827]'
                }
              `}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Версия / подвал */}
      <div className="px-6 py-4 border-t border-gray-100">
        <p className="text-xs text-[#6B7280]">aki v0.1</p>
      </div>
    </aside>
  )
}
