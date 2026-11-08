'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Habit, HabitLog, HabitWithLogs, Principle } from '@/lib/types'

let cachedHabits: HabitWithLogs[] | null = null
let cachedPrinciples: Principle[] | null = null

function calculateStreak(logs: HabitLog[], type: 'positive' | 'negative'): number {
  const today = new Date()
  let streak = 0

  if (type === 'positive') {
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
  const [habits, setHabits] = useState<HabitWithLogs[]>(cachedHabits || [])
  const [principles, setPrinciples] = useState<Principle[]>(cachedPrinciples || [])
  const [isLoading, setIsLoading] = useState(!cachedHabits)
  const isFetchingRef = useRef(false)

  const today = new Date().toISOString().split('T')[0]

  const fetchHabits = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    if (!isSilent && !cachedHabits) setIsLoading(true)

    try {
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: true })

      if (habitsError) throw habitsError

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { data: logsData, error: logsError } = await supabase
        .from('habit_logs')
        .select('*')
        .gte('logged_date', thirtyDaysAgo.toISOString().split('T')[0])

      if (logsError) throw logsError

      const habitsWithLogs: HabitWithLogs[] = (habitsData || []).map((habit: Habit) => {
        const habitLogs = (logsData || []).filter((log: HabitLog) => log.habit_id === habit.id)
        const completedToday = habitLogs.some(
          (log: HabitLog) => log.logged_date === today && log.completed
        )
        const streak = calculateStreak(habitLogs, habit.type)
        return { ...habit, logs: habitLogs, completedToday, streak }
      })

      cachedHabits = habitsWithLogs
      setHabits(habitsWithLogs)
    } catch (error) {
      console.error('Ошибка загрузки привычек:', error)
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [today])

  const fetchPrinciples = useCallback(async () => {
    const { data, error } = await supabase
      .from('principles')
      .select('*')
      .order('created_at', { ascending: true })

    if (!error && data) {
      const clean = data.filter((p) => !p.text.startsWith('tg_chat:') && !p.text.startsWith('ai_mem:'))
      cachedPrinciples = clean
      setPrinciples(clean)
    }
  }, [])

  useEffect(() => {
    fetchHabits(!!cachedHabits)
    fetchPrinciples()

    const handleSync = () => {
      fetchHabits(true)
      fetchPrinciples()
    }

    window.addEventListener('aki-db-changed', handleSync)
    window.addEventListener('focus', handleSync)

    const channel = supabase
      .channel('habits-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, handleSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_logs' }, handleSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'principles' }, handleSync)
      .subscribe()

    return () => {
      window.removeEventListener('aki-db-changed', handleSync)
      window.removeEventListener('focus', handleSync)
      supabase.removeChannel(channel)
    }
  }, [fetchHabits, fetchPrinciples])

  const addHabit = async (name: string, type: Habit['type'], frequency: Habit['frequency']) => {
    const { error } = await supabase.from('habits').insert({ name, type, frequency, streak: 0 })
    if (!error) fetchHabits(true)
    return !error
  }

  const deleteHabit = async (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id))
    const { error } = await supabase.from('habits').delete().eq('id', id)
    if (!error) fetchHabits(true)
  }

  const toggleHabit = async (habitId: string, completedToday: boolean) => {
    // Оптимистичное обновление
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId
          ? {
              ...h,
              completedToday: !completedToday,
              streak: !completedToday ? h.streak + 1 : Math.max(0, h.streak - 1),
            }
          : h
      )
    )

    if (completedToday) {
      await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('logged_date', today)
    } else {
      await supabase.from('habit_logs').upsert({ habit_id: habitId, logged_date: today, completed: true })
    }
    fetchHabits(true)
  }

  const addPrinciple = async (text: string) => {
    const { error } = await supabase.from('principles').insert({ text })
    if (!error) fetchPrinciples()
    return !error
  }

  const deletePrinciple = async (id: string) => {
    setPrinciples((prev) => prev.filter((p) => p.id !== id))
    const { error } = await supabase.from('principles').delete().eq('id', id)
    if (!error) fetchPrinciples()
  }

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
    refresh: () => fetchHabits(true),
  }
}
