'use client'

import { useState } from 'react'
import { Goal, GoalStatus } from '@/lib/types'
import { Trash2, CheckCircle2, Clock, PauseCircle, Check, Edit2 } from 'lucide-react'

interface GoalCardProps {
  goal: Goal
  onDelete: (id: string) => void
  onUpdateProgress: (id: string, progress: number) => void
  onUpdateStatus: (id: string, status: GoalStatus) => void
  onUpdateTitle?: (id: string, title: string) => void
}

const statusConfig: Record<GoalStatus, { label: string; bg: string; text: string; icon: any }> = {
  active: { label: 'В процессе', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: Clock },
  completed: { label: 'Достигнута', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2 },
  paused: { label: 'На паузе', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600', icon: PauseCircle },
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
      className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all duration-200 group relative ${
        goal.status === 'completed' ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100'
      }`}
    >
      {/* Шапка цели */}
      <div className="flex items-start justify-between gap-2 mb-2">
        {isEditing ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
            autoFocus
            className="text-sm font-bold text-slate-900 border-b border-[#3B4FDE] outline-none flex-1 bg-transparent py-0.5"
          />
        ) : (
          <h4
            onClick={() => setIsEditing(true)}
            className={`text-sm font-bold leading-snug flex-1 cursor-pointer hover:text-[#3B4FDE] transition-colors ${
              goal.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'
            }`}
            title="Нажмите, чтобы переименовать"
          >
            {goal.title}
          </h4>
        )}

        {/* Действия при наведении */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Редактировать"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Удалить цель"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Описание (если есть) */}
      {goal.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{goal.description}</p>
      )}

      {/* Прогресс-бар и процент */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-500 text-[11px] font-medium">Прогресс выполнения</span>
          <span className="font-bold text-slate-800 text-[11px]">{goal.progress}%</span>
        </div>
        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${
              goal.progress >= 100
                ? 'bg-emerald-500'
                : goal.progress > 50
                ? 'bg-[#3B4FDE]'
                : 'bg-indigo-400'
            }`}
            style={{ width: `${goal.progress}%` }}
          />
        </div>
      </div>

      {/* Быстрые кнопки изменения прогресса */}
      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-50 text-[11px]">
        <div className="flex items-center gap-1">
          {[25, 50, 75, 100].map((step) => (
            <button
              key={step}
              onClick={() => onUpdateProgress(goal.id, step)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                goal.progress === step
                  ? 'bg-[#3B4FDE] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-[#3B4FDE]'
              }`}
            >
              {step}%
            </button>
          ))}
        </div>

        {/* Статус */}
        <button
          onClick={cycleStatus}
          className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold flex items-center gap-1 transition-colors ${currentStatus.bg} ${currentStatus.text}`}
          title="Нажмите для смены статуса"
        >
          <StatusIcon size={10} />
          <span>{currentStatus.label}</span>
        </button>
      </div>
    </div>
  )
}
