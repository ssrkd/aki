'use client'

import { useState } from 'react'
import { Check, Trash2, Flame } from 'lucide-react'
import { HabitWithLogs } from '@/lib/types'

interface HabitCardProps {
  habit: HabitWithLogs
  onToggle: (id: string, completedToday: boolean) => void
  onDelete: (id: string) => void
}

const frequencyLabels: Record<string, string> = {
  daily: 'Каждый день',
  '3x_week': '3 раза в неделю',
  '2x_week': '2 раза в неделю',
  weekly: 'Раз в неделю',
}

export default function HabitCard({ habit, onToggle, onDelete }: HabitCardProps) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(habit.id)
    setDeleting(false)
  }

  const isNegative = habit.type === 'negative'

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border
        transition-all duration-200
        ${
          habit.completedToday && !isNegative
            ? 'bg-blue-50 border-blue-100'
            : 'bg-white border-gray-100 hover:border-gray-200'
        }
      `}
    >
      {/* Чекбокс (только для позитивных) */}
      {!isNegative && (
        <button
          onClick={() => onToggle(habit.id, habit.completedToday)}
          className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
            transition-all duration-200
            ${
              habit.completedToday
                ? 'bg-[#3B4FDE] border-[#3B4FDE]'
                : 'border-gray-300 hover:border-[#3B4FDE]'
            }
          `}
        >
          {habit.completedToday && <Check size={12} className="text-white" />}
        </button>
      )}

      {/* Название и частота */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            habit.completedToday && !isNegative
              ? 'line-through text-[#6B7280]'
              : 'text-[#111827]'
          }`}
        >
          {habit.name}
        </p>
        <p className="text-xs text-[#6B7280]">{frequencyLabels[habit.frequency]}</p>
      </div>

      {/* Стрик */}
      {habit.streak > 0 && (
        <div className="flex items-center gap-1 text-orange-500">
          <Flame size={14} />
          <span className="text-xs font-medium">{habit.streak}</span>
        </div>
      )}

      {/* Удалить */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="p-1.5 rounded-lg text-[#6B7280] hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

