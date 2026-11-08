'use client'

import { Book, BookStatus } from '@/lib/types'
import { Star, Trash2, BookOpen } from 'lucide-react'

interface BookCardProps {
  book: Book
  onDelete: (id: string) => void
  onUpdate?: (id: string, updates: Partial<Book>) => void
  onUpdateStatus?: (id: string, status: BookStatus) => void
}

const statusConfig: Record<BookStatus, { label: string; badge: string }> = {
  reading: { label: 'Читаю', badge: 'bg-slate-900 text-white' },
  completed: { label: 'Прочитал', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  want: { label: 'В планах', badge: 'bg-slate-100 text-slate-600' },
}

export default function BookCard({ book, onDelete, onUpdate, onUpdateStatus }: BookCardProps) {
  const { label, badge } = statusConfig[book.status] || statusConfig.want

  const cycleStatus = () => {
    const statuses: BookStatus[] = ['want', 'reading', 'completed']
    const next = statuses[(statuses.indexOf(book.status) + 1) % statuses.length]
    if (onUpdate) onUpdate(book.id, { status: next })
    else if (onUpdateStatus) onUpdateStatus(book.id, next)
  }

  const setRating = (star: number) => {
    if (onUpdate) onUpdate(book.id, { rating: star })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-card hover:border-slate-300 transition-all group flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-50 text-slate-700">
              <BookOpen size={14} />
            </div>
            <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
              {book.title}
            </h4>
          </div>
          <button
            onClick={() => onDelete(book.id)}
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
          >
            <Trash2 size={12} />
          </button>
        </div>

        {book.author && (
          <p className="text-[11px] text-slate-400 pl-7 mb-2 truncate">{book.author}</p>
        )}

        {book.notes && (
          <p className="text-[11px] text-slate-500 pl-7 italic line-clamp-2 mb-2">{book.notes}</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-2">
        <button
          onClick={cycleStatus}
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${badge}`}
        >
          {label}
        </button>

        {/* Звездочки рейтинга */}
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="p-0.5"
            >
              <Star
                size={11}
                className={
                  star <= (book.rating || 0)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-200 fill-slate-100 hover:text-slate-300'
                }
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
