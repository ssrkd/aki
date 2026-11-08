'use client'

import { useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import HabitList from '@/components/habits/HabitList'
import AddHabitModal from '@/components/habits/AddHabitModal'
import HabitCalendar from '@/components/habits/HabitCalendar'
import { useHabits } from '@/hooks/useHabits'
import { HabitType } from '@/lib/types'
import { Plus, Trash2, Zap } from 'lucide-react'
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
  const [quickHabitName, setQuickHabitName] = useState('')

  const handleAddPositive = () => { setDefaultType('positive'); setModalOpen(true) }
  const handleAddNegative = () => { setDefaultType('negative'); setModalOpen(true) }

  // Реальный расчёт прогресса за последние 7 дней (без случайных чисел и без скачков)
  const chartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const dateStr = d.toISOString().split('T')[0]
      const dayName = d.toLocaleDateString('ru-RU', { weekday: 'short' })

      if (positiveHabits.length === 0) {
        return { day: dayName, progress: 0 }
      }

      // Подсчет выполненных привычек за эту дату
      const completedOnDay = positiveHabits.filter((h) =>
        h.logs?.some((l) => l.logged_date === dateStr && l.completed)
      ).length

      const percent = Math.round((completedOnDay / positiveHabits.length) * 100)
      return {
        day: dayName,
        progress: percent,
      }
    })
  }, [positiveHabits])

  const statCards = [
    { label: 'Прогресс дня', value: `${progressPercent}%`, color: 'text-[#3B4FDE]' },
    { label: 'Активные привычки', value: totalPositive + negativeHabits.length },
    { label: 'Выполнено сегодня', value: completedToday },
    { label: 'Осталось сегодня', value: Math.max(0, totalPositive - completedToday) },
  ]

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickHabitName.trim()) return
    await addHabit(quickHabitName.trim(), 'positive', 'daily')
    setQuickHabitName('')
  }

  return (
    <AppLayout title="Привычки" subtitle="Отслеживайте свои привычки и ежедневный прогресс">
      {/* Быстрое добавление привычки одной строкой */}
      <form onSubmit={handleQuickAdd} className="mb-6 flex gap-2">
        <input
          type="text"
          value={quickHabitName}
          onChange={(e) => setQuickHabitName(e.target.value)}
          placeholder="⚡ Быстро добавить привычку (напишите и нажмите Enter)..."
          className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-[#111827] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#3B4FDE] focus:border-transparent shadow-sm"
        />
        <button
          type="submit"
          disabled={!quickHabitName.trim()}
          className="px-4 py-2.5 bg-[#3B4FDE] hover:bg-[#2d3fb5] disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus size={16} />
          <span>Добавить</span>
        </button>
      </form>

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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#111827]">Прогресс за неделю</h3>
              <span className="text-[11px] font-medium text-[#3B4FDE] bg-indigo-50 px-2 py-0.5 rounded-full">
                Реальные данные
              </span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B7280' }} unit="%" tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Выполнение']}
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                />
                <Line
                  type="monotone"
                  dataKey="progress"
                  stroke="#3B4FDE"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#3B4FDE', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#3B4FDE' }}
                  isAnimationActive={false}
                />
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
