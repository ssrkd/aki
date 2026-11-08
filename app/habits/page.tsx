'use client'

import { useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import HabitCalendar from '@/components/habits/HabitCalendar'
import { useHabits } from '@/hooks/useHabits'
import { Plus, Trash2, Check, Flame } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function HabitsPage() {
  const {
    positiveHabits,
    negativeHabits,
    principles,
    completedToday,
    totalPositive,
    progressPercent,
    addHabit,
    deleteHabit,
    toggleHabit,
    addPrinciple,
    deletePrinciple,
  } = useHabits()

  const [newPositive, setNewPositive] = useState('')
  const [newNegative, setNewNegative] = useState('')
  const [newPrinciple, setNewPrinciple] = useState('')

  // Реальный прогресс за 7 дней (без demo)
  const chartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const dateStr = d.toISOString().split('T')[0]
      const dayName = d.toLocaleDateString('ru-RU', { weekday: 'short' })

      if (positiveHabits.length === 0) {
        return { day: dayName, progress: 0 }
      }

      const completedOnDay = positiveHabits.filter((h) =>
        h.logs?.some((l) => l.logged_date === dateStr && l.completed)
      ).length

      const percent = Math.round((completedOnDay / positiveHabits.length) * 100)
      return { day: dayName, progress: percent }
    })
  }, [positiveHabits])

  return (
    <AppLayout title="Привычки" subtitle="Ежедневный ритм и принципы">
      {/* Минималистичная статистика */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-card">
          <p className="text-[11px] text-slate-400 font-medium mb-1">Прогресс дня</p>
          <p className="text-xl font-bold text-slate-900">{progressPercent}%</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-card">
          <p className="text-[11px] text-slate-400 font-medium mb-1">Выполнено</p>
          <p className="text-xl font-bold text-slate-900">{completedToday} / {totalPositive}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-card">
          <p className="text-[11px] text-slate-400 font-medium mb-1">Всего привычек</p>
          <p className="text-xl font-bold text-slate-900">{positiveHabits.length + negativeHabits.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-card">
          <p className="text-[11px] text-slate-400 font-medium mb-1">Принципов</p>
          <p className="text-xl font-bold text-slate-900">{principles.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Левая колонка — списки привычек и принципы */}
        <div className="lg:col-span-2 space-y-6">
          {/* Позитивные привычки */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-card">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Привычки
            </h3>

            <div className="space-y-1.5 mb-3">
              {positiveHabits.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">Нет привычек. Добавьте первую ниже.</p>
              ) : (
                positiveHabits.map((habit) => (
                  <div
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id, habit.completedToday)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group select-none ${
                      habit.completedToday
                        ? 'bg-slate-50 border-slate-200 text-slate-400'
                        : 'bg-white border-slate-100 hover:border-slate-300 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                          habit.completedToday
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'border-slate-300 group-hover:border-slate-500'
                        }`}
                      >
                        {habit.completedToday && <Check size={13} strokeWidth={3} />}
                      </div>
                      <span className={`text-xs font-medium ${habit.completedToday ? 'line-through text-slate-400' : ''}`}>
                        {habit.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {habit.streak > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full font-medium">
                          <Flame size={12} /> {habit.streak}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteHabit(habit.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                        title="Удалить"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Добавление привычки сразу в строку */}
            <input
              type="text"
              value={newPositive}
              onChange={(e) => setNewPositive(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newPositive.trim()) {
                  addHabit(newPositive.trim(), 'positive', 'daily')
                  setNewPositive('')
                }
              }}
              placeholder="+ Новая привычка... Enter"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-dashed border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:border-solid outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Негативные привычки */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-card">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              От чего отказаться
            </h3>

            <div className="space-y-1.5 mb-3">
              {negativeHabits.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">Нет записей.</p>
              ) : (
                negativeHabits.map((habit) => (
                  <div
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id, habit.completedToday)}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-300 bg-white transition-all cursor-pointer group select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                          habit.completedToday
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'border-slate-300 group-hover:border-slate-500'
                        }`}
                      >
                        {habit.completedToday && <Check size={13} strokeWidth={3} />}
                      </div>
                      <span className={`text-xs font-medium ${habit.completedToday ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {habit.name}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteHabit(habit.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <input
              type="text"
              value={newNegative}
              onChange={(e) => setNewNegative(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newNegative.trim()) {
                  addHabit(newNegative.trim(), 'negative', 'daily')
                  setNewNegative('')
                }
              }}
              placeholder="+ Что исключить... Enter"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-dashed border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:border-solid outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Принципы */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-card">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Личные принципы
            </h3>

            <div className="space-y-1 mb-3">
              {principles.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 group transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                    <p className="text-xs text-slate-800">{p.text}</p>
                  </div>
                  <button
                    onClick={() => deletePrinciple(p.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

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
              placeholder="+ Новый принцип... Enter"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-dashed border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:border-solid outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Правая колонка — стабильный график и мини-календарь */}
        <div className="space-y-6">
          {/* График прогресса за неделю */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Прогресс за 7 дней
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">реальные логи</span>
            </div>

            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} unit="%" tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(v) => [`${v}%`, 'Выполнение']}
                    contentStyle={{ borderRadius: 10, fontSize: 11, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="progress"
                    stroke="#0F172A"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: '#0F172A', strokeWidth: 0 }}
                    activeDot={{ r: 4.5, fill: '#0F172A' }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Мини-календари привычек */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-card">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Сетка привычек (7 недель)
            </h3>
            <div className="space-y-3">
              {[...positiveHabits, ...negativeHabits].slice(0, 6).map((habit) => (
                <div key={habit.id}>
                  <p className="text-[11px] text-slate-500 mb-1 truncate font-medium">{habit.name}</p>
                  <HabitCalendar logs={habit.logs} habitId={habit.id} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
