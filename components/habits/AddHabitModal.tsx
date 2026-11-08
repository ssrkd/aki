'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { HabitType, HabitFrequency } from '@/lib/types'

interface AddHabitModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string, type: HabitType, frequency: HabitFrequency) => Promise<boolean>
  defaultType?: HabitType
}

const frequencyOptions: { value: HabitFrequency; label: string }[] = [
  { value: 'daily', label: 'Каждый день' },
  { value: '3x_week', label: '3 раза в неделю' },
  { value: '2x_week', label: '2 раза в неделю' },
  { value: 'weekly', label: 'Раз в неделю' },
]

export default function AddHabitModal({ isOpen, onClose, onAdd, defaultType = 'positive' }: AddHabitModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<HabitType>(defaultType)
  const [frequency, setFrequency] = useState<HabitFrequency>('daily')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Введите название привычки')
      return
    }
    setIsLoading(true)
    const success = await onAdd(name.trim(), type, frequency)
    setIsLoading(false)
    if (success) {
      setName('')
      setError('')
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить привычку">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Название"
          placeholder="Например: Утренняя зарядка"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          autoFocus
        />

        {/* Тип */}
        <div>
          <label className="text-sm font-medium text-[#111827] block mb-2">Тип</label>
          <div className="flex gap-2">
            {(['positive', 'negative'] as HabitType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all duration-200 ${
                  type === t
                    ? 'bg-[#3B4FDE] text-white border-[#3B4FDE]'
                    : 'bg-white text-[#6B7280] border-gray-200 hover:border-gray-300'
                }`}
              >
                {t === 'positive' ? 'Позитивная' : 'Негативная'}
              </button>
            ))}
          </div>
        </div>

        {/* Частота */}
        <div>
          <label className="text-sm font-medium text-[#111827] block mb-2">Частота</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as HabitFrequency)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#3B4FDE]"
          >
            {frequencyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Отмена
          </Button>
          <Button type="submit" isLoading={isLoading} className="flex-1">
            Добавить
          </Button>
        </div>
      </form>
    </Modal>
  )
}

