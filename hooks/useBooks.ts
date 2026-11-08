'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Book, BookStatus } from '@/lib/types'

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<BookStatus | 'all'>('all')

  const fetchBooks = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setBooks(data || [])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  const addBook = async (
    title: string,
    author: string,
    status: BookStatus,
    rating?: number,
    notes?: string,
    finished_at?: string
  ) => {
    const { error } = await supabase.from('books').insert({
      title,
      author,
      status,
      rating: rating || null,
      notes: notes || null,
      finished_at: finished_at || null,
    })
    if (!error) fetchBooks()
    return !error
  }

  const updateBook = async (id: string, updates: Partial<Book>) => {
    const { error } = await supabase.from('books').update(updates).eq('id', id)
    if (!error) fetchBooks()
    return !error
  }

  const deleteBook = async (id: string) => {
    const { error } = await supabase.from('books').delete().eq('id', id)
    if (!error) fetchBooks()
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
    refresh: fetchBooks,
  }
}

