'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Note, NoteCategory } from '@/lib/types'

let cachedNotes: Note[] | null = null

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(cachedNotes || [])
  const [isLoading, setIsLoading] = useState(!cachedNotes)
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNote, setSelectedNote] = useState<Note | null>(
    cachedNotes && cachedNotes.length > 0 ? cachedNotes[0] : null
  )
  const isFetchingRef = useRef(false)

  const fetchNotes = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    if (!isSilent && !cachedNotes) setIsLoading(true)

    try {
      const res = await fetch('/api/notes')
      const data = await res.json()

      if (data?.notes) {
        cachedNotes = data.notes
        setNotes(data.notes)
        setSelectedNote((current) => {
          if (!current && data.notes.length > 0) return data.notes[0]
          if (current) {
            const found = data.notes.find((n: Note) => n.id === current.id)
            return found || data.notes[0] || null
          }
          return null
        })
      }
    } catch (e) {
      console.warn('Ошибка загрузки notes:', e)
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchNotes(!!cachedNotes)

    const handleSync = () => fetchNotes(true)
    window.addEventListener('aki-db-changed', handleSync)

    return () => {
      window.removeEventListener('aki-db-changed', handleSync)
    }
  }, [fetchNotes])

  const addNote = async (title: string, category: NoteCategory, content?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, content: content || '' }),
      })
      const data = await res.json()

      if (res.ok && data?.note) {
        cachedNotes = [data.note, ...(cachedNotes || [])]
        setNotes((prev) => [data.note, ...prev])
        setSelectedNote(data.note)
        window.dispatchEvent(new CustomEvent('aki-db-changed'))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const updateNote = async (id: string, updates: Partial<Note>): Promise<boolean> => {
    // Оптимистичное обновление
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)))
    setSelectedNote((prev) => (prev && prev.id === id ? { ...prev, ...updates } : prev))

    try {
      const res = await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('aki-db-changed'))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const deleteNote = async (id: string): Promise<boolean> => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (selectedNote?.id === id) {
      setSelectedNote((prev) => {
        const remaining = notes.filter((n) => n.id !== id)
        return remaining[0] || null
      })
    }

    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('aki-db-changed'))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const filteredNotes = notes.filter((note) => {
    const matchCategory = selectedCategory === 'all' || note.category === selectedCategory
    const matchSearch =
      searchQuery === '' ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchCategory && matchSearch
  })

  return {
    notes: filteredNotes,
    allNotes: notes,
    isLoading,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectedNote,
    setSelectedNote,
    addNote,
    updateNote,
    deleteNote,
    refresh: () => fetchNotes(true),
  }
}
