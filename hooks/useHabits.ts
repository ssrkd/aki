'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Habit, HabitLog, HabitWithLogs, Principle } from '@/lib/types'

function calculateStreak(logs: HabitLog[], type: 'positive' | 'negative'): number {
  const today = new Date()
  let streak = 0

  if (type === 'positive') {
    // Для позитивных: считаем дни подряд когда привычка выполнена
    for (let i = 0; i < 365; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const log = logs.find((l) => l.logged_date === dateStr && l.completed)
      if (log) {
        streak++
      } else {
        break
      }
    }
  } else {
    // Для негативных: считаем дни подряд без срыва
    for (let i = 1; i < 365; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const log = logs.find((l) => l.logged_date === dateStr && l.completed)
      if (!log) {
        streak++
      } else {
        break
      }
    }
  }

  return streak
}

export function useHabits() {
  const [habits, setHabits] = useState<HabitWithLogs[]>([])
  const [principles, setPrinciples] = useState<Principle[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  const fetchHabits = useCallback(async () => {
    setIsLoading(true)
    try {
      // Загружаем привычки
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: true })

      if (habitsError) throw habitsError

      // Загружаем логи за последние 30 дней
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { data: logsData, error: logsError } = await supabase
        .from('habit_logs')
        .select('*')
        .gte('logged_date', thirtyDaysAgo.toISOString().split('T')[0])

      if (logsError) throw logsError

      // Объединяем данные
      const habitsWithLogs: HabitWithLogs[] = (habitsData || []).map((habit: Habit) => {
        const habitLogs = (logsData || []).filter((log: HabitLog) => log.habit_id === habit.id)
        const completedToday = habitLogs.some(
          (log: HabitLog) => log.logged_date === today && log.completed
        )
        const streak = calculateStreak(habitLogs, habit.type)
        return { ...habit, logs: habitLogs, completedToday, streak }
      })

      setHabits(habitsWithLogs)
    } catch (error) {
      console.error('Ошибка загрузки привычек:', error)
    } finally {
      setIsLoading(false)
    }
  }, [today])

  const fetchPrinciples = useCallback(async () => {
    const { data, error } = await supabase
      .from('principles')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error) setPrinciples((data || []).filter((p) => !p.text.startsWith('tg_chat:')))
  }, [])

  useEffect(() => {
    fetchHabits()
    fetchPrinciples()
  }, [fetchHabits, fetchPrinciples])

  const addHabit = async (name: string, type: Habit['type'], frequency: Habit['frequency']) => {
    const { error } = await supabase.from('habits').insert({ name, type, frequency })
    if (!error) fetchHabits()
    return !error
  }

  const deleteHabit = async (id: string) => {
    const { error } = await supabase.from('habits').delete().eq('id', id)
    if (!error) fetchHabits()
  }

  const toggleHabit = async (habitId: string, completedToday: boolean) => {
    if (completedToday) {
      // Удалить лог за сегодня
      await supabase
        .from('habit_logs')
        .delete()
        .eq('habit_id', habitId)
        .eq('logged_date', today)
    } else {
      // Добавить лог за сегодня
      await supabase.from('habit_logs').upsert({
        habit_id: habitId,
        logged_date: today,
        completed: true,
      })
    }
    fetchHabits()
  }

  const addPrinciple = async (text: string) => {
    const { error } = await supabase.from('principles').insert({ text })
    if (!error) fetchPrinciples()
    return !error
  }

  const deletePrinciple = async (id: string) => {
    const { error } = await supabase.from('principles').delete().eq('id', id)
    if (!error) fetchPrinciples()
  }

  // Статистика за сегодня
  const positiveHabits = habits.filter((h) => h.type === 'positive')
  const negativeHabits = habits.filter((h) => h.type === 'negative')
  const completedToday = habits.filter((h) => h.type === 'positive' && h.completedToday).length
  const totalPositive = positiveHabits.length
  const progressPercent = totalPositive > 0 ? Math.round((completedToday / totalPositive) * 100) : 0

  return {
    habits,
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
    refresh: fetchHabits,
  }
}

