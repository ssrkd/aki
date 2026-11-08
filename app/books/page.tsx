'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import BookCard from '@/components/books/BookCard'
import { useBooks } from '@/hooks/useBooks'
import { Plus } from 'lucide-react'
import { BookStatus } from '@/lib/types'

const statusFilters: { value: BookStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'reading', label: 'Читаю' },
  { value: 'completed', label: 'Прочитал' },
  { value: 'want', label: 'В планах' },
]

export default function BooksPage() {
  const { books, stats, filterStatus, setFilterStatus, addBook, updateBook, deleteBook } = useBooks()
  const [quickInput, setQuickInput] = useState('')

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickInput.trim()) return

    // Поддержка "Название - Автор"
    const parts = quickInput.split('-')
    const title = parts[0].trim()
    const author = parts[1] ? parts[1].trim() : ''

    await addBook(title, author, filterStatus === 'all' ? 'want' : filterStatus)
    setQuickInput('')
  }

  return (
    <AppLayout title="Книги" subtitle="Личная библиотека">
      {/* Статистика */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-card">
          <p className="text-[11px] text-slate-400 font-medium mb-1">Всего книг</p>
          <p className="text-xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-card">
          <p className="text-[11px] text-slate-400 font-medium mb-1">Читаю сейчас</p>
          <p className="text-xl font-bold text-slate-900">{stats.reading}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-card">
          <p className="text-[11px] text-slate-400 font-medium mb-1">Прочитано</p>
          <p className="text-xl font-bold text-slate-900">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-card">
          <p className="text-[11px] text-slate-400 font-medium mb-1">В планах</p>
          <p className="text-xl font-bold text-slate-900">{stats.want}</p>
        </div>
      </div>

      {/* Быстрое добавление книги в одну строку и фильтры */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
          {statusFilters.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterStatus(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === value
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleQuickAdd} className="flex-1 max-w-md flex items-center gap-2">
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="+ Название книги — Автор... Enter"
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-dashed border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:border-solid bg-white text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-xs"
          />
        </form>
      </div>

      {/* Сетка книг */}
      {books.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-card">
          <p className="text-xs text-slate-400">В этом разделе пока нет книг.</p>
          <p className="text-[11px] text-slate-400 mt-1">Напишите название выше и нажмите Enter!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onUpdate={updateBook}
              onDelete={deleteBook}
            />
          ))}
        </div>
      )}
    </AppLayout>
  )
}
