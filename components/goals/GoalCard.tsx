'use client'

import { Goal, GoalStatus } from '@/lib/types'
import Badge from '@/components/ui/Badge'
import { Trash2, Pencil } from 'lucide-react'

interface GoalCardProps {
  goal: Goal
  onDelete: (id: string) => void
  onUpdateProgress: (id: string, progress: number) => void
  onUpdateStatus: (id: string, status: GoalStatus) => void
}

const statusConfig: Record<GoalStatus, { label: string; variant: 'blue' | 'green' | 'gray' }> = {
  active: { label: 'В процессе', variant: 'blue' },
  completed: { label: 'Выполнено', variant: 'green' },
  paused: { label: 'Заморожено', variant: 'gray' },
}

export default function GoalCard({ goal, onDelete, onUpdateProgress, onUpdateStatus }: GoalCardProps) {
  const { label, variant } = statusConfig[goal.status]

  const cycleStatus = () => {
    const statuses: GoalStatus[] = ['active', 'completed', 'paused']
    const next = statuses[(statuses.indexOf(goal.status) + 1) % statuses.length]
    onUpdateStatus(goal.id, next)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-card group">
      {/* Шапка */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-[#111827] leading-snug flex-1">{goal.title}</h4>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onDelete(goal.id)}
            className="p-1 rounded text-[#6B7280] hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Описание */}
      {goal.description && (
        <p className="text-xs text-[#6B7280] mb-3 line-clamp-2">{goal.description}</p>
      )}

      {/* Прогресс */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[#6B7280]">Прогресс</span>
          <span className="text-xs font-medium text-[#111827]">{goal.progress}%</span>
        </div>
        <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-[#3B4FDE] rounded-full transition-all duration-300"
            style={{ width: `${goal.progress}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={goal.progress}
          onChange={(e) => onUpdateProgress(goal.id, parseInt(e.target.value))}
          className="w-full mt-1 accent-[#3B4FDE] cursor-pointer"
        />
      </div>

      {/* Статус */}
      <button onClick={cycleStatus}>
        <Badge variant={variant}>{label}</Badge>
      </button>
    </div>
  )
}

