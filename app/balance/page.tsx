'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useBalance, BalanceRecord } from '@/hooks/useBalance'
import {
  Briefcase,
  Activity,
  Users,
  Home,
  DollarSign,
  Brain,
  Compass,
  Zap,
  Check,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'

interface SphereConfig {
  key: keyof Omit<BalanceRecord, 'id' | 'month' | 'notes'>
  label: string
  icon: any
  desc: string
  color: string
  barBg: string
}

const SPHERES: SphereConfig[] = [
  {
    key: 'career',
    label: 'Карьера и проекты',
    icon: Briefcase,
    desc: 'Прогресс в работе, кодинг, стартапы и масштаб',
    color: 'text-blue-600',
    barBg: 'bg-blue-600',
  },
  {
    key: 'health',
    label: 'Здоровье и спорт',
    icon: Activity,
    desc: 'Сон, физическая форма, энергия, питание',
    color: 'text-emerald-600',
    barBg: 'bg-emerald-600',
  },
  {
    key: 'discipline',
    label: 'Дисциплина и фокус',
    icon: Zap,
    desc: 'Ранние подъёмы, следование плану, сила воли',
    color: 'text-amber-600',
    barBg: 'bg-amber-600',
  },
  {
    key: 'finances',
    label: 'Финансы и капитал',
    icon: DollarSign,
    desc: 'Доходы, сбережения, финансовая подушка',
    color: 'text-green-600',
    barBg: 'bg-green-600',
  },
  {
    key: 'development',
    label: 'Саморазвитие',
    icon: Brain,
    desc: 'Книги, новые навыки, мышление, ментальная зрелость',
    color: 'text-purple-600',
    barBg: 'bg-purple-600',
  },
  {
    key: 'friends',
    label: 'Друзья и окружение',
    icon: Users,
    desc: 'Близкие друзья, качество общения, взаимовыручка',
    color: 'text-indigo-600',
    barBg: 'bg-indigo-600',
  },
  {
    key: 'family',
    label: 'Семья и родные',
    icon: Home,
    desc: 'Отношения с родителями, теплота, забота',
    color: 'text-rose-600',
    barBg: 'bg-rose-600',
  },
  {
    key: 'rest',
    label: 'Отдых и перезагрузка',
    icon: Compass,
    desc: 'Качественный отдых, путешествия, хобби, радость жизни',
    color: 'text-sky-600',
    barBg: 'bg-sky-600',
  },
]

export default function BalancePage() {
  const {
    selectedMonth,
    setSelectedMonth,
    currentRecord,
    loading,
    saving,
    saveCurrentScores,
  } = useBalance()

  const [notesInput, setNotesInput] = useState(currentRecord.notes || '')

  // Расчет среднего балла
  const scores = SPHERES.map((s) => Number(currentRecord[s.key]) || 5)
  const averageScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)

  // Переключение месяцев
  const handleMonthChange = (offset: number) => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1 + offset, 1))
    const newMonthStr = date.toISOString().slice(0, 7)
    setSelectedMonth(newMonthStr)
  }

  const formatMonthTitle = (mStr: string) => {
    const [y, m] = mStr.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, 1))
    return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  }

  const handleSliderChange = (key: SphereConfig['key'], value: number) => {
    saveCurrentScores({ [key]: value })
  }

  const handleNotesBlur = () => {
    if (notesInput !== currentRecord.notes) {
      saveCurrentScores({ notes: notesInput })
    }
  }

  return (
    <AppLayout title="Колесо баланса" subtitle="Аудит и гармония 8 ключевых сфер твоей жизни">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Верхняя навигация по месяцам и средний балл */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleMonthChange(-1)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              <span className="text-sm font-bold text-slate-800 capitalize">
                {formatMonthTitle(selectedMonth)}
              </span>
            </div>

            <button
              onClick={() => handleMonthChange(1)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[11px] font-medium text-slate-400">Средний индекс баланса</div>
              <div className="text-xl font-bold text-slate-900 tracking-tight">
                {averageScore} <span className="text-xs font-normal text-slate-400">/ 10</span>
              </div>
            </div>

            <div className="h-8 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-xl ${
                  Number(averageScore) >= 7.5
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : Number(averageScore) >= 5.5
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {Number(averageScore) >= 7.5
                  ? 'Высокий тонус'
                  : Number(averageScore) >= 5.5
                  ? 'Норма'
                  : 'Требует внимания'}
              </span>

              {saving && <span className="text-[10px] text-slate-400 animate-pulse">Сохранение...</span>}
            </div>
          </div>
        </div>

        {/* Сетка 8 сфер жизни */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SPHERES.map((sphere) => {
            const Icon = sphere.icon
            const value = Number(currentRecord[sphere.key]) || 5

            return (
              <div
                key={sphere.key}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-slate-50 ${sphere.color}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{sphere.label}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{sphere.desc}</p>
                    </div>
                  </div>

                  <span className="text-sm font-mono font-bold text-slate-900 px-2 py-0.5 rounded-lg bg-slate-100">
                    {value}/10
                  </span>
                </div>

                {/* Прогресс-бар визуализации */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      value >= 8
                        ? 'bg-emerald-500'
                        : value >= 6
                        ? 'bg-slate-800'
                        : value >= 4
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${(value / 10) * 100}%` }}
                  />
                </div>

                {/* Интерактивный ползунок */}
                <div className="pt-1">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={value}
                    onChange={(e) => handleSliderChange(sphere.key, parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono pt-1">
                    <span>1 (Спад)</span>
                    <span>5</span>
                    <span>10 (Идеал)</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Заметки и фокус месяца */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-slate-600" />
            <h4 className="text-xs font-bold text-slate-800">
              Выводы и фокус на {formatMonthTitle(selectedMonth)}
            </h4>
          </div>
          <p className="text-[11px] text-slate-400">
            Какую сферу нужно подтянуть в первую очередь? Запиши конкретное действие или решение.
          </p>
          <textarea
            rows={3}
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Например: Сделать акцент на режиме сна и подъёме до 07:30. Встретиться с Ансаром на выходных..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
          />
        </div>
      </div>
    </AppLayout>
  )
}

