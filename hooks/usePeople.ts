'use client'

import { useState, useEffect, useCallback } from 'react'

export interface Person {
  id: string
  name: string
  nickname?: string
  relation: 'friend' | 'family' | 'colleague' | 'mentor' | string
  age?: number
  city?: string
  birthday?: string
  occupation?: string
  how_met?: string
  tastes?: string
  important_people?: string
  goals_problems?: string
  gifts?: string
  debts_promises?: string
  avatar_url?: string
  last_contact_date?: string
  notes?: string
  created_at?: string
}

let cachedPeople: Person[] | null = null

export function usePeople() {
  const [people, setPeople] = useState<Person[]>(cachedPeople || [])
  const [loading, setLoading] = useState(!cachedPeople)

  const fetchPeople = useCallback(async () => {
    try {
      const res = await fetch('/api/people')
      const data = await res.json()
      if (data.people) {
        cachedPeople = data.people
        setPeople(data.people)
      }
    } catch (e) {
      console.warn('Ошибка загрузки people:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPeople()

    const handleSync = () => fetchPeople()
    window.addEventListener('aki-db-changed', handleSync)
    return () => window.removeEventListener('aki-db-changed', handleSync)
  }, [fetchPeople])

  const addPerson = async (newPerson: Partial<Person>) => {
    const tempId = 'temp-' + Date.now()
    const optimistic: Person = {
      id: tempId,
      name: newPerson.name || '',
      relation: newPerson.relation || 'friend',
      avatar_url: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(newPerson.name || '')}`,
      last_contact_date: new Date().toISOString().split('T')[0],
      ...newPerson,
    } as Person

    setPeople((prev) => [optimistic, ...prev])

    try {
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPerson),
      })
      const data = await res.json()
      if (data.person) {
        setPeople((prev) => prev.map((p) => (p.id === tempId ? data.person : p)))
      }
    } catch {
      fetchPeople()
    }
  }

  const updatePerson = async (id: string, updates: Partial<Person>) => {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
    try {
      await fetch('/api/people', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
    } catch {
      fetchPeople()
    }
  }

  const deletePerson = async (id: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== id))
    try {
      await fetch(`/api/people?id=${id}`, { method: 'DELETE' })
    } catch {
      fetchPeople()
    }
  }

  return { people, loading, addPerson, updatePerson, deletePerson, refresh: fetchPeople }
}
