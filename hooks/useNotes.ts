'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Note, NoteCategory } from '@/lib/types'

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)

  const fetchNotes = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false })
    if (!error) {
      setNotes(data || [])
      // Автовыбор первой заметки
      if (data && data.length > 0 && !selectedNote) {
        setSelectedNote(data[0])
      }
    }
    setIsLoading(false)
  }, [selectedNote])

  useEffect(() => {
    fetchNotes()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addNote = async (title: string, category: NoteCategory, content?: string) => {
    const { data, error } = await supabase
      .from('notes')
      .insert({ title, category, content: content || '' })
      .select()
      .single()
    if (!error && data) {
      fetchNotes()
      setSelectedNote(data)
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
      if (selectedNote?.id === id) {
        setSelectedNote((prev) => (prev ? { ...prev, ...updates } : null))
      }
    }
    return !error
  }

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (!error) {
      fetchNotes()
      if (selectedNote?.id === id) setSelectedNote(null)
    }
  }

  // Фильтрация
  const filteredNotes = notes.filter((note) => {
    const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory
    const matchesSearch =
      searchQuery === '' ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
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
    refresh: fetchNotes,
  }
}

