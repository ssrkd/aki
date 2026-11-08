'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import PlanCard from '@/components/plans/PlanCard'
import { usePlans } from '@/hooks/usePlans'
import { PlanStatus } from '@/lib/types'

const statusFilters: { value: PlanStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'В процессе' },
  { value: 'completed', label: 'Готово' },
  { value: 'paused', label: 'На паузе' },
]

export default function PlansPage() {
  const { plans, addPlan, updateStatus, deletePlan, addTask, toggleTask, deleteTask } = usePlans()
  const [filter, setFilter] = useState<PlanStatus | 'all'>('all')
  const [newPlanTitle, setNewPlanTitle] = useState('')

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlanTitle.trim()) return
    await addPlan(newPlanTitle.trim(), '')
    setNewPlanTitle('')
  }

  const filteredPlans = filter === 'all' ? plans : plans.filter((p) => p.status === filter)

  return (
    <AppLayout title="Планы" subtitle="Проекты и списки задач">
      {/* Фильтры и быстрый ввод плана */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
          {statusFilters.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === value
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleQuickAdd} className="flex-1 max-w-md">
          <input
            type="text"
            value={newPlanTitle}
            onChange={(e) => setNewPlanTitle(e.target.value)}
            placeholder="+ Создать план (напишите и нажмите Enter)..."
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-dashed border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:border-solid bg-white text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-xs"
          />
        </form>
      </div>

      {filteredPlans.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-card">
          <p className="text-xs text-slate-400">В этом разделе пока нет планов.</p>
          <p className="text-[11px] text-slate-400 mt-1">Создайте новый план в поле выше!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onDelete={deletePlan}
              onUpdateStatus={updateStatus}
              onToggleTask={toggleTask}
              onAddTask={addTask}
              onDeleteTask={deleteTask}
            />
          ))}
        </div>
      )}
    </AppLayout>
  )
}
