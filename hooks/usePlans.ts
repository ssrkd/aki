'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plan, PlanTask, PlanStatus } from '@/lib/types'

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchPlans = useCallback(async () => {
    setIsLoading(true)
    const { data: plansData, error: plansError } = await supabase
      .from('plans')
      .select('*')
      .order('created_at', { ascending: false })

    if (plansError) {
      setIsLoading(false)
      return
    }

    const { data: tasksData } = await supabase
      .from('plan_tasks')
      .select('*')
      .order('created_at', { ascending: true })

    const plansWithTasks: Plan[] = (plansData || []).map((plan: Plan) => ({
      ...plan,
      tasks: (tasksData || []).filter((t: PlanTask) => t.plan_id === plan.id),
    }))

    setPlans(plansWithTasks)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const addPlan = async (title: string, description: string, deadline?: string) => {
    const { error } = await supabase.from('plans').insert({
      title,
      description: description || null,
      deadline: deadline || null,
    })
    if (!error) fetchPlans()
    return !error
  }

  const updatePlan = async (id: string, updates: Partial<Plan>) => {
    const { tasks, ...planData } = updates
    const { error } = await supabase.from('plans').update(planData).eq('id', id)
    if (!error) fetchPlans()
    return !error
  }

  const updateStatus = async (id: string, status: PlanStatus) => {
    return updatePlan(id, { status })
  }

  const deletePlan = async (id: string) => {
    const { error } = await supabase.from('plans').delete().eq('id', id)
    if (!error) fetchPlans()
  }

  const addTask = async (planId: string, title: string) => {
    const { error } = await supabase.from('plan_tasks').insert({ plan_id: planId, title })
    if (!error) fetchPlans()
    return !error
  }

  const toggleTask = async (taskId: string, completed: boolean) => {
    const { error } = await supabase
      .from('plan_tasks')
      .update({ completed: !completed })
      .eq('id', taskId)
    if (!error) fetchPlans()
  }

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('plan_tasks').delete().eq('id', taskId)
    if (!error) fetchPlans()
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
    refresh: fetchPlans,
  }
}

