'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { AchievementCategory } from '@/lib/types'

interface AddAchievementModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (title: string, description: string, category: AchievementCategory, achieved_at: string) => Promise<boolean>
}

const categories: { value: AchievementCategory; label: string }[] = [
  { value: 'personal', label: 'Личное' },
  { value: 'professional', label: 'Профессиональное' },
  { value: 'health', label: 'Здоровье' },
  { value: 'other', label: 'Другое' },
]

export default function AddAchievementModal({ isOpen, onClose, onAdd }: AddAchievementModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<AchievementCategory>('personal')
  const [achievedAt, setAchievedAt] = useState(new Date().toISOString().split('T')[0])
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setIsLoading(true)
    const success = await onAdd(title, description, category, achievedAt)
    setIsLoading(false)
    if (success) {
      setTitle(''); setDescription('')
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить достижение">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Достижение" placeholder="Что вы достигли?" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <div>
          <label className="text-sm font-medium text-[#111827] block mb-1">Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Расскажите подробнее..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#111827] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#3B4FDE]"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[#111827] block mb-2">Категория</label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(({ value, label }) => (
              <button key={value} type="button" onClick={() => setCategory(value)}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                  category === value ? 'bg-[#3B4FDE] text-white border-[#3B4FDE]' : 'bg-white text-[#6B7280] border-gray-200'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <Input label="Дата достижения" type="date" value={achievedAt} onChange={(e) => setAchievedAt(e.target.value)} />
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Отмена</Button>
          <Button type="submit" isLoading={isLoading} className="flex-1">Добавить</Button>
        </div>
      </form>
    </Modal>
  )
}

