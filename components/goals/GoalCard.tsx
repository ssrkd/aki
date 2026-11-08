'use client'

import { useState } from 'react'
import { Goal, GoalStatus } from '@/lib/types'
import { Trash2, CheckCircle2, Clock, PauseCircle, Edit2 } from 'lucide-react'

interface GoalCardProps {
  goal: Goal
  onDelete: (id: string) => void
  onUpdateProgress: (id: string, progress: number) => void
  onUpdateStatus: (id: string, status: GoalStatus) => void
  onUpdateTitle?: (id: string, title: string) => void
}

const statusConfig: Record<GoalStatus, { label: string; badge: string; icon: any }> = {
  active: { label: 'В процессе', badge: 'bg-slate-100 text-slate-700', icon: Clock },
  completed: { label: 'Достигнута', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  paused: { label: 'Пауза', badge: 'bg-slate-50 text-slate-400', icon: PauseCircle },
}

export default function GoalCard({
  goal,
  onDelete,
  onUpdateProgress,
  onUpdateStatus,
  onUpdateTitle,
}: GoalCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(goal.title)
  const currentStatus = statusConfig[goal.status] || statusConfig.active
  const StatusIcon = currentStatus.icon

  const cycleStatus = () => {
    const statuses: GoalStatus[] = ['active', 'completed', 'paused']
    const next = statuses[(statuses.indexOf(goal.status) + 1) % statuses.length]
    onUpdateStatus(goal.id, next)
  }

  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle !== goal.title && onUpdateTitle) {
      onUpdateTitle(goal.id, editedTitle.trim())
    }
    setIsEditing(false)
  }

  return (
    <div
      className={`bg-white rounded-xl border p-4 shadow-card hover:border-slate-300 transition-all group relative select-none ${
        goal.status === 'completed' ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        {isEditing ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
            autoFocus
            className="text-xs font-semibold text-slate-900 border-b border-slate-900 outline-none flex-1 bg-transparent py-0.5"
          />
        ) : (
          <h4
            onClick={() => setIsEditing(true)}
            className={`text-xs font-semibold leading-snug flex-1 cursor-pointer hover:text-slate-600 transition-colors ${
              goal.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'
            }`}
            title="Нажмите, чтобы переименовать"
          >
            {goal.title}
          </h4>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {goal.description && (
        <p className="text-[11px] text-slate-500 mb-2.5 line-clamp-2">{goal.description}</p>
      )}

      {/* Прогресс-бар */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
          <span>Прогресс</span>
          <span className="font-mono font-medium text-slate-700">{goal.progress}%</span>
        </div>
        <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-slate-900 rounded-full transition-all duration-200"
            style={{ width: `${goal.progress}%` }}
          />
        </div>
      </div>

      {/* Кнопки быстрого шага прогресса */}
      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-50 text-[10px]">
        <div className="flex items-center gap-1">
          {[25, 50, 75, 100].map((step) => (
            <button
              key={step}
              onClick={() => onUpdateProgress(goal.id, step)}
              className={`px-1.5 py-0.5 rounded font-mono transition-colors ${
                goal.progress === step
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {step}%
            </button>
          ))}
        </div>

        <button
          onClick={cycleStatus}
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 transition-colors ${currentStatus.badge}`}
        >
          <StatusIcon size={10} />
          <span>{currentStatus.label}</span>
        </button>
      </div>
    </div>
  )
}
