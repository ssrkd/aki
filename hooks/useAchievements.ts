'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Achievement, AchievementCategory } from '@/lib/types'

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAchievements = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('achieved_at', { ascending: false })
    if (!error) setAchievements(data || [])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchAchievements()
  }, [fetchAchievements])

  const addAchievement = async (
    title: string,
    description: string,
    category: AchievementCategory,
    achieved_at: string
  ) => {
    const { error } = await supabase.from('achievements').insert({
      title,
      description: description || null,
      category,
      achieved_at,
    })
    if (!error) fetchAchievements()
    return !error
  }

  const deleteAchievement = async (id: string) => {
    const { error } = await supabase.from('achievements').delete().eq('id', id)
    if (!error) fetchAchievements()
  }

  const now = new Date()
  const currentYear = now.getFullYear().toString()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const stats = {
    total: achievements.length,
    thisYear: achievements.filter((a) => a.achieved_at.startsWith(currentYear)).length,
    thisMonth: achievements.filter((a) => a.achieved_at.startsWith(currentMonth)).length,
  }

  return {
    achievements,
    isLoading,
    stats,
    addAchievement,
    deleteAchievement,
    refresh: fetchAchievements,
  }
}

