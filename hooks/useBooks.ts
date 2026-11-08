'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Book, BookStatus } from '@/lib/types'

let cachedBooks: Book[] | null = null

export function useBooks() {
  const [books, setBooks] = useState<Book[]>(cachedBooks || [])
  const [isLoading, setIsLoading] = useState(!cachedBooks)
  const [filterStatus, setFilterStatus] = useState<BookStatus | 'all'>('all')
  const isFetchingRef = useRef(false)

  const fetchBooks = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    if (!isSilent && !cachedBooks) setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        cachedBooks = data
        setBooks(data)
      }
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchBooks(!!cachedBooks)

    const handleSync = () => fetchBooks(true)
    window.addEventListener('aki-db-changed', handleSync)
    window.addEventListener('focus', handleSync)

    const channel = supabase
      .channel('books-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, handleSync)
      .subscribe()

    return () => {
      window.removeEventListener('aki-db-changed', handleSync)
      window.removeEventListener('focus', handleSync)
      supabase.removeChannel(channel)
    }
  }, [fetchBooks])

  const addBook = async (
    title: string,
    author: string,
    status: BookStatus,
    rating?: number,
    notes?: string,
    finished_at?: string
  ) => {
    const tempBook: Book = {
      id: 'temp-' + Date.now(),
      title,
      author,
      status,
      rating: rating || null,
      notes: notes || null,
      finished_at: finished_at || null,
      created_at: new Date().toISOString(),
    }
    setBooks((prev) => [tempBook, ...prev])

    const { error } = await supabase.from('books').insert({
      title,
      author,
      status,
      rating: rating || null,
      notes: notes || null,
      finished_at: finished_at || null,
    })
    fetchBooks(true)
    return !error
  }

  const updateBook = async (id: string, updates: Partial<Book>) => {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)))
    const { error } = await supabase.from('books').update(updates).eq('id', id)
    fetchBooks(true)
    return !error
  }

  const deleteBook = async (id: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== id))
    const { error } = await supabase.from('books').delete().eq('id', id)
    fetchBooks(true)
  }

  const filteredBooks =
    filterStatus === 'all' ? books : books.filter((b) => b.status === filterStatus)

  const stats = {
    total: books.length,
    reading: books.filter((b) => b.status === 'reading').length,
    completed: books.filter((b) => b.status === 'completed').length,
    want: books.filter((b) => b.status === 'want').length,
  }

  return {
    books: filteredBooks,
    allBooks: books,
    isLoading,
    filterStatus,
    setFilterStatus,
    stats,
    addBook,
    updateBook,
    deleteBook,
    refresh: () => fetchBooks(true),
  }
}
