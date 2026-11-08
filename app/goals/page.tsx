'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import GoalList from '@/components/goals/GoalList'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useGoals } from '@/hooks/useGoals'
import { GoalHorizon } from '@/lib/types'

const horizons: { key: GoalHorizon; title: string; subtitle: string }[] = [
  { key: '1year', title: 'На год', subtitle: 'Краткосрочные цели' },
  { key: '5years', title: 'На 5 лет', subtitle: 'Среднесрочные цели' },
  { key: '10years', title: 'На 10 лет', subtitle: 'Долгосрочные цели' },
]

export default function GoalsPage() {
  const { goalsByHorizon, isLoading, addGoal, deleteGoal, updateProgress, updateStatus } = useGoals()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedHorizon, setSelectedHorizon] = useState<GoalHorizon>('1year')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleAdd = (horizon: GoalHorizon) => {
    setSelectedHorizon(horizon)
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setIsSaving(true)
    await addGoal(title, description, selectedHorizon)
    setIsSaving(false)
    setTitle('')
    setDescription('')
    setModalOpen(false)
  }

  return (
    <AppLayout title="Цели" subtitle="Ваши цели на год, 5 и 10 лет">
      <div className="grid grid-cols-3 gap-6">
        {horizons.map(({ key, title: horizonTitle, subtitle }) => (
          <GoalList
            key={key}
            horizon={key}
            title={horizonTitle}
            goals={goalsByHorizon[key]}
            onAdd={() => handleAdd(key)}
            onDelete={deleteGoal}
            onUpdateProgress={updateProgress}
            onUpdateStatus={updateStatus}
          />
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Новая цель">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#111827] block mb-2">Горизонт</label>
            <div className="flex gap-2">
              {horizons.map(({ key, title: ht }) => (
                <button key={key} type="button" onClick={() => setSelectedHorizon(key)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                    selectedHorizon === key ? 'bg-[#3B4FDE] text-white border-[#3B4FDE]' : 'bg-white text-[#6B7280] border-gray-200'
                  }`}>
                  {ht}
                </button>
              ))}
            </div>
          </div>
          <Input label="Цель" placeholder="Чего вы хотите достичь?" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <div>
            <label className="text-sm font-medium text-[#111827] block mb-1">Описание</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробности..." rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#111827] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#3B4FDE]"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Отмена</Button>
            <Button type="submit" isLoading={isSaving} className="flex-1">Добавить</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}

