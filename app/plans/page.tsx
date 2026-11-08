'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import PlanCard from '@/components/plans/PlanCard'
import AddPlanModal from '@/components/plans/AddPlanModal'
import { usePlans } from '@/hooks/usePlans'
import Button from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import { PlanStatus } from '@/lib/types'

const statusFilters: { value: PlanStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'completed', label: 'Завершённые' },
  { value: 'paused', label: 'На паузе' },
]

export default function PlansPage() {
  const { plans, addPlan, updateStatus, deletePlan, addTask, toggleTask, deleteTask } = usePlans()
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter] = useState<PlanStatus | 'all'>('all')

  const filteredPlans = filter === 'all' ? plans : plans.filter((p) => p.status === filter)

  return (
    <AppLayout title="Планы" subtitle="Ваши проекты и планы">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {statusFilters.map(({ value, label }) => (
            <button key={value} onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === value ? 'bg-[#3B4FDE] text-white' : 'bg-white text-[#6B7280] hover:bg-gray-100'
              }`}>
              {label}
            </button>
          ))}
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Создать план
        </Button>
      </div>

      {filteredPlans.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-card">
          <p className="text-sm text-[#6B7280]">Нет планов. Создайте первый!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
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

      <AddPlanModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onAdd={addPlan} />
    </AppLayout>
  )
}

