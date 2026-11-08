'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Transaction, TransactionType, FinanceSummary, MonthlyData } from '@/lib/types'

export function useFinances() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
    if (!error) setTransactions(data || [])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const addTransaction = async (
    type: TransactionType,
    amount: number,
    category: string,
    description: string,
    transaction_date: string
  ) => {
    const { error } = await supabase.from('transactions').insert({
      type,
      amount,
      category,
      description,
      transaction_date,
    })
    if (!error) fetchTransactions()
    return !error
  }

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) fetchTransactions()
  }

  // Текущий месяц
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const monthlyTransactions = transactions.filter((t) =>
    t.transaction_date.startsWith(currentMonth)
  )

  const summary: FinanceSummary = {
    income: monthlyTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0),
    expense: monthlyTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0),
    savings: monthlyTransactions
      .filter((t) => t.type === 'savings')
      .reduce((sum, t) => sum + Number(t.amount), 0),
    balance: 0,
  }
  summary.balance = summary.income - summary.expense - summary.savings

  // Данные по месяцам для графика (последние 6 месяцев)
  const monthlyData: MonthlyData[] = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthName = date.toLocaleDateString('ru-RU', { month: 'short' })

    const monthTrans = transactions.filter((t) => t.transaction_date.startsWith(monthStr))
    monthlyData.push({
      month: monthName,
      income: monthTrans
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      expense: monthTrans
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0),
    })
  }

  return {
    transactions,
    monthlyTransactions,
    isLoading,
    summary,
    monthlyData,
    addTransaction,
    deleteTransaction,
    refresh: fetchTransactions,
  }
}

