'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { BookStatus } from '@/lib/types'
import { Star } from 'lucide-react'

interface AddBookModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (
    title: string,
    author: string,
    status: BookStatus,
    rating?: number,
    notes?: string,
    finished_at?: string
  ) => Promise<boolean>
}

export default function AddBookModal({ isOpen, onClose, onAdd }: AddBookModalProps) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [status, setStatus] = useState<BookStatus>('want')
  const [rating, setRating] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [finishedAt, setFinishedAt] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !author.trim()) return
    setIsLoading(true)
    const success = await onAdd(
      title, author, status,
      rating || undefined, notes || undefined, finishedAt || undefined
    )
    setIsLoading(false)
    if (success) {
      setTitle(''); setAuthor(''); setRating(0); setNotes(''); setFinishedAt('')
      onClose()
    }
  }

  const statusLabels: Record<BookStatus, string> = {
    want: 'Хочу прочитать',
    reading: 'Читаю',
    completed: 'Прочитал',
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить книгу">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Название" placeholder="Название книги" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <Input label="Автор" placeholder="Автор" value={author} onChange={(e) => setAuthor(e.target.value)} />

        <div>
          <label className="text-sm font-medium text-[#111827] block mb-2">Статус</label>
          <div className="flex gap-2">
            {(['want', 'reading', 'completed'] as BookStatus[]).map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                  status === s ? 'bg-[#3B4FDE] text-white border-[#3B4FDE]' : 'bg-white text-[#6B7280] border-gray-200'
                }`}>
                {statusLabels[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Рейтинг */}
        <div>
          <label className="text-sm font-medium text-[#111827] block mb-2">Оценка</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button" onClick={() => setRating(star === rating ? 0 : star)}>
                <Star size={22} className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-[#111827] block mb-1">Заметки / выводы</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Что запомнилось..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#111827] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#3B4FDE]"
          />
        </div>

        {status === 'completed' && (
          <Input label="Дата прочтения" type="date" value={finishedAt} onChange={(e) => setFinishedAt(e.target.value)} />
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Отмена</Button>
          <Button type="submit" isLoading={isLoading} className="flex-1">Добавить</Button>
        </div>
      </form>
    </Modal>
  )
}

