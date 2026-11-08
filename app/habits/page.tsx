'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import HabitList from '@/components/habits/HabitList'
import AddHabitModal from '@/components/habits/AddHabitModal'
import HabitCalendar from '@/components/habits/HabitCalendar'
import { useHabits } from '@/hooks/useHabits'
import { HabitType } from '@/lib/types'
import { Plus, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function HabitsPage() {
  const {
    positiveHabits,
    negativeHabits,
    principles,
    isLoading,
    completedToday,
    totalPositive,
    progressPercent,
    addHabit,
    deleteHabit,
    toggleHabit,
    addPrinciple,
    deletePrinciple,
  } = useHabits()

  const [modalOpen, setModalOpen] = useState(false)
  const [defaultType, setDefaultType] = useState<HabitType>('positive')
  const [newPrinciple, setNewPrinciple] = useState('')

  const handleAddPositive = () => { setDefaultType('positive'); setModalOpen(true) }
  const handleAddNegative = () => { setDefaultType('negative'); setModalOpen(true) }

  // Данные для графика (заглушка за 7 дней)
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return {
      day: date.toLocaleDateString('ru-RU', { weekday: 'short' }),
      progress: Math.floor(Math.random() * 40 + 60), // TODO: реальные данные
    }
  })

  const statCards = [
    { label: 'Прогресс дня', value: `${progressPercent}%`, color: 'text-[#3B4FDE]' },
    { label: 'Активные привычки', value: totalPositive + negativeHabits.length },
    { label: 'Выполнено сегодня', value: completedToday },
    { label: 'Осталось сегодня', value: totalPositive - completedToday },
  ]

  return (
    <AppLayout title="Привычки" subtitle="Отслеживайте свои привычки">
      {/* Статистические карточки */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-card border border-gray-50">
            <p className="text-xs text-[#6B7280] mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color || 'text-[#111827]'}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Левая колонка — списки привычек */}
        <div className="col-span-2 space-y-4">
          <HabitList
            title="Позитивные привычки"
            habits={positiveHabits}
            onToggle={toggleHabit}
            onDelete={deleteHabit}
            onAdd={handleAddPositive}
          />

          <HabitList
            title="Негативные привычки"
            habits={negativeHabits}
            onToggle={toggleHabit}
            onDelete={deleteHabit}
            onAdd={handleAddNegative}
          />

          {/* Принципы */}
          <div className="bg-white rounded-xl shadow-card border border-gray-50 p-4">
            <h3 className="text-sm font-semibold text-[#111827] mb-3">Принципы</h3>
            <div className="space-y-2 mb-3">
              {principles.map((p) => (
                <div key={p.id} className="flex items-start gap-2 group">
                  <span className="text-[#3B4FDE] mt-0.5">•</span>
                  <p className="text-sm text-[#111827] flex-1">{p.text}</p>
                  <button
                    onClick={() => deletePrinciple(p.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 text-[#6B7280] hover:text-red-500 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPrinciple}
                onChange={(e) => setNewPrinciple(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPrinciple.trim()) {
                    addPrinciple(newPrinciple.trim())
                    setNewPrinciple('')
                  }
                }}
                placeholder="Новый принцип..."
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3B4FDE]"
              />
              <button
                onClick={() => {
                  if (newPrinciple.trim()) {
                    addPrinciple(newPrinciple.trim())
                    setNewPrinciple('')
                  }
                }}
                className="p-1.5 rounded-lg bg-[#3B4FDE] text-white hover:bg-[#2d3fb5] transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Правая колонка — календарь и график */}
        <div className="space-y-4">
          {/* Мини-календари привычек */}
          <div className="bg-white rounded-xl shadow-card border border-gray-50 p-4">
            <h3 className="text-sm font-semibold text-[#111827] mb-3">Прогресс (7 недель)</h3>
            <div className="space-y-3">
              {[...positiveHabits, ...negativeHabits].slice(0, 5).map((habit) => (
                <div key={habit.id}>
                  <p className="text-xs text-[#6B7280] mb-1 truncate">{habit.name}</p>
                  <HabitCalendar logs={habit.logs} habitId={habit.id} />
                </div>
              ))}
            </div>
          </div>

          {/* График прогресса */}
          <div className="bg-white rounded-xl shadow-card border border-gray-50 p-4">
            <h3 className="text-sm font-semibold text-[#111827] mb-3">Прогресс за неделю</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B7280' }} unit="%" />
                <Tooltip formatter={(v) => [`${v}%`, 'Прогресс']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="progress" stroke="#3B4FDE" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Модальное окно добавления */}
      <AddHabitModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={addHabit}
        defaultType={defaultType}
      />
    </AppLayout>
  )
}

