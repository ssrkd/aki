'use client'

import { Search, Bell } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-100 px-6 flex items-center justify-between sticky top-0 z-10">
      {/* Заголовок страницы */}
      <div>
        <h1 className="text-lg font-semibold text-[#111827]">{title}</h1>
        {subtitle && <p className="text-xs text-[#6B7280]">{subtitle}</p>}
      </div>

      {/* Поиск и уведомления */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
          />
          <input
            type="text"
            placeholder="Поиск..."
            className="
              pl-9 pr-4 py-2 rounded-lg border border-gray-200
              text-sm text-[#111827] placeholder:text-[#6B7280]
              bg-[#F3F4F6] focus:bg-white
              focus:outline-none focus:ring-2 focus:ring-[#3B4FDE] focus:border-transparent
              transition-all duration-200 w-48
            "
          />
        </div>
        <button className="p-2 rounded-lg text-[#6B7280] hover:bg-gray-100 transition-colors relative">
          <Bell size={18} />
        </button>
      </div>
    </header>
  )
}
