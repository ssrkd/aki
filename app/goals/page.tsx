'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import GoalCard from '@/components/goals/GoalCard'
import { useGoals } from '@/hooks/useGoals'
import { GoalHorizon } from '@/lib/types'
import { Target, Plus, CheckCircle2, TrendingUp, Sparkles, Clock, Calendar } from 'lucide-react'

const HORIZONS: { key: GoalHorizon; title: string; subtitle: string; color: string; badge: string }[] = [
  { key: '1year', title: 'На 1 год', subtitle: 'Краткосрочные цели', color: 'border-blue-500', badge: 'bg-blue-50 text-blue-700' },
  { key: '5years', title: 'На 5 лет', subtitle: 'Среднесрочные ориентиры', color: 'border-indigo-500', badge: 'bg-indigo-50 text-indigo-700' },
  { key: '10years', title: 'На 10 лет', subtitle: 'Стратегическое видение', color: 'border-purple-500', badge: 'bg-purple-50 text-purple-700' },
]

export default function GoalsPage() {
  const { goals, goalsByHorizon, addGoal, deleteGoal, updateProgress, updateStatus, updateGoal } = useGoals()

  // Поля быстрого ввода для каждой колонки
  const [inlineInputs, setInlineInputs] = useState<Record<GoalHorizon, string>>({
    '1year': '',
    '5years': '',
    '10years': '',
  })

  // Глобальное быстрое поле сверху
  const [topInput, setTopInput] = useState('')
  const [topHorizon, setTopHorizon] = useState<GoalHorizon>('1year')

  // Статистика
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

  const handleUpdateTitle = (id: string, newTitle: string) => {
    updateGoal(id, { title: newTitle })
  }

  return (
    <AppLayout title="Цели" subtitle="Стратегическое планирование на 1, 5 и 10 лет">
      {/* Верхняя статистика */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl text-[#3B4FDE]">
            <Target size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Всего целей</p>
            <p className="text-2xl font-bold text-slate-900">{totalGoals}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">В процессе</p>
            <p className="text-2xl font-bold text-slate-900">{activeGoals}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Достигнуто</p>
            <p className="text-2xl font-bold text-slate-900">{completedGoals}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Средний прогресс</p>
            <p className="text-2xl font-bold text-[#3B4FDE]">{avgProgress}%</p>
          </div>
        </div>
      </div>

      {/* Верхняя панель мгновенного добавления (без модалок) */}
      <form onSubmit={handleTopAdd} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 mb-6 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {HORIZONS.map((h) => (
            <button
              key={h.key}
              type="button"
              onClick={() => setTopHorizon(h.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                topHorizon === h.key
                  ? 'bg-white text-[#3B4FDE] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
          placeholder="⚡ Сразу напишите цель и нажмите Enter (без всплывающих окон)..."
          className="flex-1 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent outline-none"
        />

        <button
          type="submit"
          disabled={!topInput.trim()}
          className="px-4 py-2 bg-[#3B4FDE] hover:bg-[#2d3fb5] disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus size={15} />
          <span>Добавить цель</span>
        </button>
      </form>

      {/* Колонки целей по горизонтам */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {HORIZONS.map(({ key, title, subtitle, badge }) => {
          const horizonGoals = goalsByHorizon[key] || []
          const currentVal = inlineInputs[key] || ''

          return (
            <div
              key={key}
              className="bg-slate-50/70 border border-slate-200/80 rounded-3xl p-4 flex flex-col shadow-xs"
            >
              {/* Шапка колонки */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{title}</h3>
                  <p className="text-[11px] text-slate-500">{subtitle}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${badge}`}>
                  {horizonGoals.length}
                </span>
              </div>

              {/* Мгновенный инлайн ввод в начале колонки */}
              <div className="my-3">
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
                  placeholder={`+ Новая цель ${title.toLowerCase()}... Enter`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#3B4FDE] focus:border-transparent shadow-xs transition-all"
                />
              </div>

              {/* Список целей */}
              <div className="space-y-3 min-h-[160px]">
                {horizonGoals.length === 0 ? (
                  <div className="bg-white/60 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                    <p className="text-xs text-slate-400">Пока нет целей в этом горизонте.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Напишите в поле выше и нажмите Enter!
                    </p>
                  </div>
                ) : (
                  horizonGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onDelete={deleteGoal}
                      onUpdateProgress={updateProgress}
                      onUpdateStatus={updateStatus}
                      onUpdateTitle={handleUpdateTitle}
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
