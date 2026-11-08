'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import BookCard from '@/components/books/BookCard'
import AddBookModal from '@/components/books/AddBookModal'
import { useBooks } from '@/hooks/useBooks'
import Button from '@/components/ui/Button'
import { Plus, BookOpen, CheckCircle, Bookmark } from 'lucide-react'
import { BookStatus } from '@/lib/types'

const statusFilters: { value: BookStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'reading', label: 'Читаю' },
  { value: 'completed', label: 'Прочитал' },
  { value: 'want', label: 'Хочу прочитать' },
]

export default function BooksPage() {
  const { books, stats, filterStatus, setFilterStatus, addBook, updateBook, deleteBook } = useBooks()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <AppLayout title="Книги" subtitle="Ваша читательская библиотека">
      {/* Статистика */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-card border border-gray-50 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg"><BookOpen size={18} className="text-blue-600" /></div>
          <div><p className="text-xs text-[#6B7280]">Читаю</p><p className="text-xl font-bold text-[#111827]">{stats.reading}</p></div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-card border border-gray-50 flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg"><CheckCircle size={18} className="text-green-600" /></div>
          <div><p className="text-xs text-[#6B7280]">Прочитал</p><p className="text-xl font-bold text-[#111827]">{stats.completed}</p></div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-card border border-gray-50 flex items-center gap-3">
          <div className="p-2 bg-yellow-50 rounded-lg"><Bookmark size={18} className="text-yellow-600" /></div>
          <div><p className="text-xs text-[#6B7280]">Хочу прочитать</p><p className="text-xl font-bold text-[#111827]">{stats.want}</p></div>
        </div>
      </div>

      {/* Фильтры и кнопка добавления */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-2">
          {statusFilters.map(({ value, label }) => (
            <button key={value} onClick={() => setFilterStatus(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === value ? 'bg-[#3B4FDE] text-white' : 'bg-white text-[#6B7280] hover:bg-gray-100'
              }`}>
              {label}
            </button>
          ))}
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Добавить книгу
        </Button>
      </div>

      {/* Сетка книг */}
      {books.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-card">
          <p className="text-sm text-[#6B7280]">Нет книг в этой категории</p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onDelete={deleteBook}
              onUpdateStatus={(id, status) => updateBook(id, { status })}
            />
          ))}
        </div>
      )}

      <AddBookModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onAdd={addBook} />
    </AppLayout>
  )
}

