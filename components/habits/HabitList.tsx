'use client'

import { Plus } from 'lucide-react'
import { HabitWithLogs } from '@/lib/types'
import HabitCard from './HabitCard'

interface HabitListProps {
  title: string
  habits: HabitWithLogs[]
  onToggle: (id: string, completedToday: boolean) => void
  onDelete: (id: string) => void
  onAdd: () => void
}

export default function HabitList({ title, habits, onToggle, onDelete, onAdd }: HabitListProps) {
  return (
    <div className="bg-white rounded-xl shadow-card border border-gray-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
        <button
          onClick={onAdd}
          className="p-1.5 rounded-lg text-[#6B7280] hover:bg-gray-100 hover:text-[#111827] transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="space-y-2 group">
        {habits.length === 0 ? (
          <p className="text-sm text-[#6B7280] text-center py-4">
            Нет привычек. Нажмите + чтобы добавить
          </p>
        ) : (
          habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}

