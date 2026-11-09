'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plan, PlanTask, PlanStatus } from '@/lib/types'

let cachedPlans: Plan[] | null = null

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>(cachedPlans || [])
  const [isLoading, setIsLoading] = useState(!cachedPlans)
  const isFetchingRef = useRef(false)

  const fetchPlans = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    if (!isSilent && !cachedPlans) setIsLoading(true)

    try {
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .order('created_at', { ascending: false })

      if (plansError) return

      const { data: tasksData } = await supabase
        .from('plan_tasks')
        .select('*')
        .order('created_at', { ascending: true })

      const plansWithTasks: Plan[] = (plansData || []).map((plan: Plan) => ({
        ...plan,
        tasks: (tasksData || []).filter((t: PlanTask) => t.plan_id === plan.id),
      }))

      cachedPlans = plansWithTasks
      setPlans(plansWithTasks)
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchPlans(!!cachedPlans)

    const handleSync = () => fetchPlans(true)
    window.addEventListener('aki-db-changed', handleSync)

    return () => {
      window.removeEventListener('aki-db-changed', handleSync)
    }
  }, [fetchPlans])

  const addPlan = async (title: string, description: string, deadline?: string) => {
    const { error } = await supabase.from('plans').insert({
      title,
      description: description || null,
      deadline: deadline || null,
    })
    if (!error) fetchPlans(true)
    return !error
  }

  const updatePlan = async (id: string, updates: Partial<Plan>) => {
    const { tasks, ...planData } = updates
    const { error } = await supabase.from('plans').update(planData).eq('id', id)
    if (!error) fetchPlans(true)
    return !error
  }

  const updateStatus = async (id: string, status: PlanStatus) => {
    return updatePlan(id, { status })
  }

  const deletePlan = async (id: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== id))
    const { error } = await supabase.from('plans').delete().eq('id', id)
    if (!error) fetchPlans(true)
  }

  const addTask = async (planId: string, title: string) => {
    const { error } = await supabase.from('plan_tasks').insert({
      plan_id: planId,
      title,
      completed: false,
    })
    if (!error) fetchPlans(true)
    return !error
  }

  const toggleTask = async (taskId: string, completed: boolean) => {
    const { error } = await supabase
      .from('plan_tasks')
      .update({ completed: !completed })
      .eq('id', taskId)
    if (!error) fetchPlans(true)
  }

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('plan_tasks').delete().eq('id', taskId)
    if (!error) fetchPlans(true)
  }

  return {
    plans,
    isLoading,
    addPlan,
    updatePlan,
    updateStatus,
    deletePlan,
    addTask,
    toggleTask,
    deleteTask,
    refresh: () => fetchPlans(true),
  }
}
