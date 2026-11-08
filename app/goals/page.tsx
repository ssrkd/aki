'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import GoalCard from '@/components/goals/GoalCard'
import { useGoals } from '@/hooks/useGoals'
import { GoalHorizon } from '@/lib/types'
import { Target, Plus, CheckCircle2, TrendingUp, Clock } from 'lucide-react'

const HORIZONS: { key: GoalHorizon; title: string; subtitle: string }[] = [
  { key: '1year', title: 'На 1 год', subtitle: 'Ближайшие цели' },
  { key: '5years', title: 'На 5 лет', subtitle: 'Среднесрочные' },
  { key: '10years', title: 'На 10 лет', subtitle: 'Долгосрочные' },
]

export default function GoalsPage() {
  const { goals, goalsByHorizon, addGoal, deleteGoal, updateProgress, updateStatus, updateGoal } = useGoals()

  const [inlineInputs, setInlineInputs] = useState<Record<GoalHorizon, string>>({
    '1year': '',
    '5years': '',
    '10years': '',
  })

  const [topInput, setTopInput] = useState('')
  const [topHorizon, setTopHorizon] = useState<GoalHorizon>('1year')

  const totalGoals = goals.length
  const completedGoals = goals.filter((g) => g.status === 'completed' || g.progress >= 100).length
  const activeGoals = totalGoals - completedGoals
  const avgProgress = totalGoals > 0 ? Math.round(goals.reduce((acc, g) => acc + (g.progress || 0), 0) / totalGoals) : 0

  const handleInlineAdd = async (horizon: GoalHorizon) => {
    const text = (inlineInputs[horizon] || '').trim()
    if (!text) return
    await addGoal(text, '', horizon)
    setInlineInputs((prev) => ({ ...prev, [horizon]: '' }))
  }

  const handleTopAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topInput.trim()) return
    await addGoal(topInput.trim(), '', topHorizon)
    setTopInput('')
  }

  return (
    <AppLayout title="Цели" subtitle="Стратегия и фокус на будущее">
      {/* Статистика */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-card">
          <p className="text-[11px] text-slate-400 font-medium mb-1">Всего целей</p>
          <p className="text-xl font-bold text-slate-900">{totalGoals}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-card">
          <p className="text-[11px] text-slate-400 font-medium mb-1">В процессе</p>
          <p className="text-xl font-bold text-slate-900">{activeGoals}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-card">
          <p className="text-[11px] text-slate-400 font-medium mb-1">Достигнуто</p>
          <p className="text-xl font-bold text-slate-900">{completedGoals}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-card">
          <p className="text-[11px] text-slate-400 font-medium mb-1">Средний прогресс</p>
          <p className="text-xl font-bold text-slate-900">{avgProgress}%</p>
        </div>
      </div>

      {/* Быстрое добавление сверху */}
      <form onSubmit={handleTopAdd} className="bg-white rounded-xl p-2.5 border border-slate-100 shadow-card mb-6 flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg">
          {HORIZONS.map((h) => (
            <button
              key={h.key}
              type="button"
              onClick={() => setTopHorizon(h.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                topHorizon === h.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {h.title}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={topInput}
          onChange={(e) => setTopInput(e.target.value)}
          placeholder="Напишите цель и нажмите Enter..."
          className="flex-1 px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 bg-transparent outline-none"
        />

        <button
          type="submit"
          disabled={!topInput.trim()}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
        >
          <Plus size={14} />
          <span>Добавить</span>
        </button>
      </form>

      {/* Колонки горизонтов */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {HORIZONS.map(({ key, title, subtitle }) => {
          const horizonGoals = goalsByHorizon[key] || []
          const currentVal = inlineInputs[key] || ''

          return (
            <div
              key={key}
              className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 flex flex-col shadow-xs"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{title}</h3>
                  <p className="text-[10px] text-slate-400">{subtitle}</p>
                </div>
                <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  {horizonGoals.length}
                </span>
              </div>

              {/* Инлайн-ввод прямо в колонке */}
              <div className="my-2.5">
                <input
                  type="text"
                  value={currentVal}
                  onChange={(e) =>
                    setInlineInputs((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleInlineAdd(key)
                    }
                  }}
                  placeholder={`+ ${title.toLowerCase()}... Enter`}
                  className="w-full px-3 py-2 rounded-xl border border-dashed border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:border-solid bg-white text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-xs"
                />
              </div>

              {/* Список целей */}
              <div className="space-y-2.5 min-h-[140px]">
                {horizonGoals.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center bg-white/40">
                    <p className="text-xs text-slate-400">Пока нет целей</p>
                  </div>
                ) : (
                  horizonGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onDelete={deleteGoal}
                      onUpdateProgress={updateProgress}
                      onUpdateStatus={updateStatus}
                      onUpdateTitle={(id, title) => updateGoal(id, { title })}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </AppLayout>
  )
}
