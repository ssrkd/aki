'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface AddPlanModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (title: string, description: string, deadline?: string) => Promise<boolean>
}

export default function AddPlanModal({ isOpen, onClose, onAdd }: AddPlanModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setIsLoading(true)
    const success = await onAdd(title, description, deadline || undefined)
    setIsLoading(false)
    if (success) {
      setTitle(''); setDescription(''); setDeadline('')
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Создать план">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Название" placeholder="Название проекта" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <div>
          <label className="text-sm font-medium text-[#111827] block mb-1">Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание плана..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#111827] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#3B4FDE]"
          />
        </div>
        <Input label="Дедлайн (необязательно)" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Отмена</Button>
          <Button type="submit" isLoading={isLoading} className="flex-1">Создать</Button>
        </div>
      </form>
    </Modal>
  )
}

