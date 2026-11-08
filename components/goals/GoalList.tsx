'use client'

import { Plus } from 'lucide-react'
import { Goal, GoalStatus, GoalHorizon } from '@/lib/types'
import GoalCard from './GoalCard'

interface GoalListProps {
  horizon: GoalHorizon
  title: string
  goals: Goal[]
  onAdd: () => void
  onDelete: (id: string) => void
  onUpdateProgress: (id: string, progress: number) => void
  onUpdateStatus: (id: string, status: GoalStatus) => void
}

export default function GoalList({
  title,
  goals,
  onAdd,
  onDelete,
  onUpdateProgress,
  onUpdateStatus,
}: GoalListProps) {
  return (
    <div className="bg-[#F3F4F6] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
          <p className="text-xs text-[#6B7280]">{goals.length} целей</p>
        </div>
        <button
          onClick={onAdd}
          className="p-1.5 rounded-lg bg-white text-[#6B7280] hover:text-[#111827] hover:shadow-sm transition-all"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="space-y-3">
        {goals.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center">
            <p className="text-sm text-[#6B7280]">Нет целей. Нажмите + чтобы добавить</p>
          </div>
        ) : (
          goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onDelete={onDelete}
              onUpdateProgress={onUpdateProgress}
              onUpdateStatus={onUpdateStatus}
            />
          ))
        )}
      </div>
    </div>
  )
}

