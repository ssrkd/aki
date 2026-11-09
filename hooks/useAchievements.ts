'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Achievement, AchievementCategory } from '@/lib/types'

let cachedAchievements: Achievement[] | null = null

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>(cachedAchievements || [])
  const [isLoading, setIsLoading] = useState(!cachedAchievements)
  const isFetchingRef = useRef(false)

  const fetchAchievements = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    if (!isSilent && !cachedAchievements) setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('achieved_at', { ascending: false })

      if (!error && data) {
        cachedAchievements = data
        setAchievements(data)
      }
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchAchievements(!!cachedAchievements)

    const handleSync = () => fetchAchievements(true)
    window.addEventListener('aki-db-changed', handleSync)

    return () => {
      window.removeEventListener('aki-db-changed', handleSync)
    }
  }, [fetchAchievements])

  const addAchievement = async (
    title: string,
    description: string,
    category: AchievementCategory,
    achieved_at: string
  ) => {
    const tempAch: Achievement = {
      id: 'temp-' + Date.now(),
      title,
      description: description || null,
      category,
      achieved_at,
      created_at: new Date().toISOString(),
    }
    setAchievements((prev) => [tempAch, ...prev])

    const { error } = await supabase.from('achievements').insert({
      title,
      description: description || null,
      category,
      achieved_at,
    })
    fetchAchievements(true)
    return !error
  }

  const deleteAchievement = async (id: string) => {
    setAchievements((prev) => prev.filter((a) => a.id !== id))
    const { error } = await supabase.from('achievements').delete().eq('id', id)
    fetchAchievements(true)
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
    refresh: () => fetchAchievements(true),
  }
}
