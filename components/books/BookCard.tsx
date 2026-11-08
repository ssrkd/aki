'use client'

import { Book, BookStatus } from '@/lib/types'
import { Star, Trash2, BookOpen } from 'lucide-react'
import Badge from '@/components/ui/Badge'

interface BookCardProps {
  book: Book
  onDelete: (id: string) => void
  onUpdateStatus: (id: string, status: BookStatus) => void
}

const statusConfig: Record<BookStatus, { label: string; variant: 'blue' | 'green' | 'gray' }> = {
  reading: { label: 'Читаю', variant: 'blue' },
  completed: { label: 'Прочитал', variant: 'green' },
  want: { label: 'Хочу прочитать', variant: 'gray' },
}

// Цвета обложек-заглушек
const coverColors = [
  'bg-blue-400', 'bg-purple-400', 'bg-green-400', 'bg-red-400',
  'bg-yellow-400', 'bg-pink-400', 'bg-indigo-400', 'bg-teal-400',
]

export default function BookCard({ book, onDelete, onUpdateStatus }: BookCardProps) {
  const { label, variant } = statusConfig[book.status]

  // Выбор цвета обложки по хэшу названия
  const colorIndex = book.title.charCodeAt(0) % coverColors.length
  const coverColor = coverColors[colorIndex]

  const cycleStatus = () => {
    const statuses: BookStatus[] = ['want', 'reading', 'completed']
    const next = statuses[(statuses.indexOf(book.status) + 1) % statuses.length]
    onUpdateStatus(book.id, next)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden group">
      {/* Обложка */}
      <div className={`${coverColor} h-32 flex items-center justify-center`}>
        <BookOpen size={32} className="text-white opacity-80" />
      </div>

      {/* Информация */}
      <div className="p-3">
        <h4 className="text-sm font-semibold text-[#111827] leading-snug line-clamp-2 mb-0.5">
          {book.title}
        </h4>
        <p className="text-xs text-[#6B7280] mb-2">{book.author}</p>

        {/* Рейтинг */}
        {book.rating && (
          <div className="flex gap-0.5 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={12}
                className={star <= book.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}
              />
            ))}
          </div>
        )}

        {/* Заметки */}
        {book.notes && (
          <p className="text-xs text-[#6B7280] italic line-clamp-2 mb-2">{book.notes}</p>
        )}

        {/* Статус и удаление */}
        <div className="flex items-center justify-between">
          <button onClick={cycleStatus}>
            <Badge variant={variant}>{label}</Badge>
          </button>
          <button
            onClick={() => onDelete(book.id)}
            className="p-1 rounded text-transparent group-hover:text-[#6B7280] hover:text-red-500 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

