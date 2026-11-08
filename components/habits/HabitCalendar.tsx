'use client'

import { HabitLog } from '@/lib/types'

interface HabitCalendarProps {
  logs: HabitLog[]
  habitId: string
}

export default function HabitCalendar({ logs, habitId }: HabitCalendarProps) {
  const days: { date: string; completed: boolean; isToday: boolean }[] = []
  const today = new Date()

  for (let i = 48; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      completed: logs.some((l) => l.habit_id === habitId && l.logged_date === dateStr && l.completed),
      isToday: i === 0,
    })
  }

  const weeks: typeof days[] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return (
    <div className="flex gap-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((day) => (
            <div
              key={day.date}
              title={day.date}
              className={`
                w-2.5 h-2.5 rounded-[2px] transition-colors
                ${day.completed ? 'bg-slate-900' : 'bg-slate-100'}
                ${day.isToday ? 'ring-1 ring-slate-900' : ''}
              `}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
