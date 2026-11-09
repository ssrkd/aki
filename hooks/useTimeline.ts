'use client'

import { useState, useEffect } from 'react'

export interface LifeEvent {
  id: string
  event_date: string
  title: string
  category: 'childhood' | 'school' | 'university' | 'career' | 'relationship' | 'turning_point' | 'victory' | 'family'
  description?: string
  importance: number
  people_names?: string
  created_at?: string
}

let cachedEvents: LifeEvent[] | null = null

export function useTimeline() {
  const [events, setEvents] = useState<LifeEvent[]>(cachedEvents || [])
  const [loading, setLoading] = useState(!cachedEvents)

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/timeline')
      if (res.ok) {
        const data = await res.json()
        const sorted = (data.events || []).sort(
          (a: LifeEvent, b: LifeEvent) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
        )
        cachedEvents = sorted
        setEvents(sorted)
      }
    } catch (err) {
      console.error('Ошибка загрузки таймлайна:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!cachedEvents) {
      fetchEvents()
    }
  }, [])

  const addEvent = async (eventData: Omit<LifeEvent, 'id' | 'created_at'>) => {
    const tempId = 'temp-' + Date.now()
    const optimisticEvent: LifeEvent = { ...eventData, id: tempId }

    setEvents((prev) => [optimisticEvent, ...prev].sort(
      (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
    ))

    try {
      const res = await fetch('/api/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.event) {
          setEvents((prev) =>
            prev.map((item) => (item.id === tempId ? data.event : item)).sort(
              (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
            )
          )
        }
      }
    } catch {
      await fetchEvents()
    }
  }

  const deleteEvent = async (id: string) => {
    setEvents((prev) => prev.filter((item) => item.id !== id))
    try {
      await fetch(`/api/timeline?id=${id}`, { method: 'DELETE' })
    } catch {
      await fetchEvents()
    }
  }

  return {
    events,
    loading,
    addEvent,
    deleteEvent,
    refresh: fetchEvents,
  }
}
