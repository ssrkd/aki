'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Goal, GoalHorizon, GoalStatus } from '@/lib/types'

// Глобальный кэш для мгновенных переходов без лагов
let cachedGoals: Goal[] | null = null

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>(cachedGoals || [])
  const [isLoading, setIsLoading] = useState(!cachedGoals)
  const isFetchingRef = useRef(false)

  const fetchGoals = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    if (!isSilent && !cachedGoals) setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        cachedGoals = data
        setGoals(data)
      }
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchGoals(!!cachedGoals)

    // Слушатель событий от aki AI
    const handleDbChange = () => fetchGoals(true)
    window.addEventListener('aki-db-changed', handleDbChange)
    window.addEventListener('focus', () => fetchGoals(true))

    // Realtime подписка Supabase
    const channel = supabase
      .channel('goals-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, () => {
        fetchGoals(true)
      })
      .subscribe()

    return () => {
      window.removeEventListener('aki-db-changed', handleDbChange)
      supabase.removeChannel(channel)
    }
  }, [fetchGoals])

  const addGoal = async (
    title: string,
    description: string = '',
    horizon: GoalHorizon = '1year'
  ) => {
    // Оптимистичное добавление
    const tempGoal: Goal = {
      id: 'temp-' + Date.now(),
      title,
      description,
      horizon,
      status: 'active',
      progress: 0,
      created_at: new Date().toISOString(),
    }
    setGoals((prev) => [tempGoal, ...prev])

    const { error } = await supabase.from('goals').insert({ title, description, horizon })
    fetchGoals(true)
    return !error
  }

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    // Оптимистичное обновление
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)))
    const { error } = await supabase.from('goals').update(updates).eq('id', id)
    fetchGoals(true)
    return !error
  }

  const deleteGoal = async (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id))
    const { error } = await supabase.from('goals').delete().eq('id', id)
    fetchGoals(true)
  }

  const updateProgress = async (id: string, progress: number) => {
    const finalProgress = Math.min(100, Math.max(0, progress))
    const updates: Partial<Goal> = { progress: finalProgress }
    if (finalProgress >= 100) updates.status = 'completed'
    return updateGoal(id, updates)
  }

  const updateStatus = async (id: string, status: GoalStatus) => {
    return updateGoal(id, { status })
  }

  const goalsByHorizon = {
    '1year': goals.filter((g) => g.horizon === '1year'),
    '5years': goals.filter((g) => g.horizon === '5years'),
    '10years': goals.filter((g) => g.horizon === '10years'),
  }

  return {
    goals,
    goalsByHorizon,
    isLoading,
    addGoal,
    updateGoal,
    deleteGoal,
    updateProgress,
    updateStatus,
    refresh: fetchGoals,
  }
}
