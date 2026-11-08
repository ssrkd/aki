'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Goal, GoalHorizon, GoalStatus } from '@/lib/types'

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchGoals = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setGoals(data || [])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const addGoal = async (
    title: string,
    description: string,
    horizon: GoalHorizon
  ) => {
    const { error } = await supabase.from('goals').insert({ title, description, horizon })
    if (!error) fetchGoals()
    return !error
  }

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    const { error } = await supabase.from('goals').update(updates).eq('id', id)
    if (!error) fetchGoals()
    return !error
  }

  const deleteGoal = async (id: string) => {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (!error) fetchGoals()
  }

  const updateProgress = async (id: string, progress: number) => {
    return updateGoal(id, { progress })
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

