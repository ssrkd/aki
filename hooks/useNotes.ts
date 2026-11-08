'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Note, NoteCategory } from '@/lib/types'

let cachedNotes: Note[] | null = null

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(cachedNotes || [])
  const [isLoading, setIsLoading] = useState(!cachedNotes)
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNote, setSelectedNote] = useState<Note | null>(cachedNotes && cachedNotes.length > 0 ? cachedNotes[0] : null)
  const isFetchingRef = useRef(false)

  const fetchNotes = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    if (!isSilent && !cachedNotes) setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false })

      if (!error && data) {
        cachedNotes = data
        setNotes(data)
        setSelectedNote((current) => {
          if (!current && data.length > 0) return data[0]
          if (current) {
            const found = data.find((n) => n.id === current.id)
            return found || data[0] || null
          }
          return null
        })
      }
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchNotes(!!cachedNotes)

    const handleSync = () => fetchNotes(true)
    window.addEventListener('aki-db-changed', handleSync)
    window.addEventListener('focus', handleSync)

    const channel = supabase
      .channel('notes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, handleSync)
      .subscribe()

    return () => {
      window.removeEventListener('aki-db-changed', handleSync)
      window.removeEventListener('focus', handleSync)
      supabase.removeChannel(channel)
    }
  }, [fetchNotes])

  const addNote = async (title: string, category: NoteCategory, content?: string) => {
    const { data, error } = await supabase
      .from('notes')
      .insert({ title, category, content: content || '' })
      .select()
      .single()

    if (!error && data) {
      cachedNotes = [data, ...(cachedNotes || [])]
      setNotes((prev) => [data, ...prev])
      setSelectedNote(data)
      fetchNotes(true)
    }
    return !error
  }

  const updateNote = async (id: string, updates: Partial<Note>) => {
    const { error } = await supabase
      .from('notes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)))
      setSelectedNote((prev) => (prev && prev.id === id ? { ...prev, ...updates } : prev))
      fetchNotes(true)
    }
    return !error
  }

  const deleteNote = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (selectedNote?.id === id) {
      setSelectedNote((prev) => {
        const remaining = notes.filter((n) => n.id !== id)
        return remaining[0] || null
      })
    }
    await supabase.from('notes').delete().eq('id', id)
    fetchNotes(true)
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
