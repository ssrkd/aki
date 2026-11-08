'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Transaction, TransactionType, FinanceSummary, MonthlyData } from '@/lib/types'

let cachedTransactions: Transaction[] | null = null

export function useFinances() {
  const [transactions, setTransactions] = useState<Transaction[]>(cachedTransactions || [])
  const [isLoading, setIsLoading] = useState(!cachedTransactions)
  const isFetchingRef = useRef(false)

  const fetchTransactions = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    if (!isSilent && !cachedTransactions) setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })

      if (!error && data) {
        cachedTransactions = data
        setTransactions(data)
      }
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchTransactions(!!cachedTransactions)

    const handleSync = () => fetchTransactions(true)
    window.addEventListener('aki-db-changed', handleSync)
    window.addEventListener('focus', handleSync)

    const channel = supabase
      .channel('finances-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, handleSync)
      .subscribe()

    return () => {
      window.removeEventListener('aki-db-changed', handleSync)
      window.removeEventListener('focus', handleSync)
      supabase.removeChannel(channel)
    }
  }, [fetchTransactions])

  const addTransaction = async (
    type: TransactionType,
    amount: number,
    category: string,
    description: string,
    transaction_date: string
  ) => {
    const tempTx: Transaction = {
      id: 'temp-' + Date.now(),
      type,
      amount,
      category,
      description,
      transaction_date,
      created_at: new Date().toISOString(),
    }
    setTransactions((prev) => [tempTx, ...prev])

    const { error } = await supabase.from('transactions').insert({
      type,
      amount,
      category,
      description,
      transaction_date,
    })
    fetchTransactions(true)
    return !error
  }

  const deleteTransaction = async (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    fetchTransactions(true)
  }

  // Текущий месяц
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const monthlyTransactions = transactions.filter((t) =>
    t.transaction_date.startsWith(currentMonth)
  )

  const income = monthlyTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const expense = monthlyTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const balance = income - expense
  const savings = Math.max(0, balance)

  const summary: FinanceSummary = {
    income,
    expense,
    savings,
    balance,
  }

  // Данные за последние 6 месяцев
  const monthlyData: MonthlyData[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthName = d.toLocaleDateString('ru-RU', { month: 'short' })

    const monthTxs = transactions.filter((t) => t.transaction_date.startsWith(monthKey))
    const income = monthTxs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const expense = monthTxs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    monthlyData.push({ month: monthName, income, expense })
  }

  return {
    transactions,
    monthlyTransactions,
    summary,
    monthlyData,
    isLoading,
    addTransaction,
    deleteTransaction,
    refresh: () => fetchTransactions(true),
  }
}
