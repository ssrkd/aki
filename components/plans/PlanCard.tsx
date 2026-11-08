'use client'

import { Plan, PlanStatus, PlanTask } from '@/lib/types'
import Badge from '@/components/ui/Badge'
import { Trash2, Calendar, CheckSquare, Square, Plus } from 'lucide-react'
import { useState } from 'react'

interface PlanCardProps {
  plan: Plan
  onDelete: (id: string) => void
  onUpdateStatus: (id: string, status: PlanStatus) => void
  onToggleTask: (taskId: string, completed: boolean) => void
  onAddTask: (planId: string, title: string) => void
  onDeleteTask: (taskId: string) => void
}

const statusConfig: Record<PlanStatus, { label: string; variant: 'blue' | 'green' | 'gray' }> = {
  active: { label: 'Активный', variant: 'blue' },
  completed: { label: 'Завершён', variant: 'green' },
  paused: { label: 'На паузе', variant: 'gray' },
}

export default function PlanCard({ plan, onDelete, onUpdateStatus, onToggleTask, onAddTask, onDeleteTask }: PlanCardProps) {
  const [newTask, setNewTask] = useState('')
  const [showTaskInput, setShowTaskInput] = useState(false)

  const tasks = plan.tasks || []
  const completedCount = tasks.filter((t) => t.completed).length
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0
  const { label, variant } = statusConfig[plan.status]

  const handleAddTask = () => {
    if (newTask.trim()) {
      onAddTask(plan.id, newTask.trim())
      setNewTask('')
      setShowTaskInput(false)
    }
  }

  const cycleStatus = () => {
    const statuses: PlanStatus[] = ['active', 'completed', 'paused']
    const next = statuses[(statuses.indexOf(plan.status) + 1) % statuses.length]
    onUpdateStatus(plan.id, next)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5 group">
      {/* Шапка */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-[#111827]">{plan.title}</h3>
        <button onClick={() => onDelete(plan.id)}
          className="p-1 rounded text-transparent group-hover:text-[#6B7280] hover:text-red-500 transition-colors flex-shrink-0">
          <Trash2 size={13} />
        </button>
      </div>

      {plan.description && (
        <p className="text-xs text-[#6B7280] mb-3">{plan.description}</p>
      )}

      {/* Дедлайн */}
      {plan.deadline && (
        <div className="flex items-center gap-1 text-xs text-[#6B7280] mb-3">
          <Calendar size={12} />
          <span>{new Date(plan.deadline).toLocaleDateString('ru-RU')}</span>
        </div>
      )}

      {/* Прогресс */}
      {tasks.length > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-[#6B7280] mb-1">
            <span>{completedCount} из {tasks.length} задач</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#3B4FDE] rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Задачи */}
      <div className="space-y-1.5 mb-3">
        {tasks.map((task: PlanTask) => (
          <div key={task.id} className="flex items-center gap-2 group/task">
            <button onClick={() => onToggleTask(task.id, task.completed)}>
              {task.completed
                ? <CheckSquare size={15} className="text-[#3B4FDE]" />
                : <Square size={15} className="text-gray-300" />
              }
            </button>
            <span className={`text-xs flex-1 ${task.completed ? 'line-through text-[#6B7280]' : 'text-[#111827]'}`}>
              {task.title}
            </span>
            <button onClick={() => onDeleteTask(task.id)}
              className="text-transparent group-hover/task:text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>

      {/* Добавить задачу */}
      {showTaskInput ? (
        <div className="flex gap-2 mb-3">
          <input
            autoFocus
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') setShowTaskInput(false) }}
            placeholder="Название задачи..."
            className="flex-1 px-2 py-1 text-xs rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#3B4FDE]"
          />
          <button onClick={handleAddTask} className="text-xs text-[#3B4FDE] font-medium">OK</button>
        </div>
      ) : (
        <button onClick={() => setShowTaskInput(true)}
          className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#3B4FDE] transition-colors mb-3">
          <Plus size={12} /> Добавить задачу
        </button>
      )}

      <button onClick={cycleStatus}>
        <Badge variant={variant}>{label}</Badge>
      </button>
    </div>
  )
}

