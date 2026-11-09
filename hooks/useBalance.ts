'use client'

import { useState, useEffect } from 'react'

export interface BalanceRecord {
  id?: string
  month: string
  career: number
  health: number
  friends: number
  family: number
  finances: number
  development: number
  rest: number
  discipline: number
  notes: string
}

const defaultRecord = (month: string): BalanceRecord => ({
  month,
  career: 6,
  health: 6,
  friends: 6,
  family: 7,
  finances: 6,
  development: 7,
  rest: 5,
  discipline: 6,
  notes: '',
})

export function useBalance() {
  const currentMonth = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [records, setRecords] = useState<Record<string, BalanceRecord>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const currentRecord = records[selectedMonth] || defaultRecord(selectedMonth)

  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/balance')
      if (res.ok) {
        const data = await res.json()
        const map: Record<string, BalanceRecord> = {}
        ;(data.records || []).forEach((r: BalanceRecord) => {
          map[r.month] = r
        })
        setRecords(map)
      }
    } catch (err) {
      console.error('Ошибка загрузки колеса баланса:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  const saveCurrentScores = async (updated: Partial<BalanceRecord>) => {
    const merged: BalanceRecord = {
      ...currentRecord,
      ...updated,
      month: selectedMonth,
    }

    setRecords((prev) => ({
      ...prev,
      [selectedMonth]: merged,
    }))

    setSaving(true)
    try {
      await fetch('/api/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      })
    } catch (err) {
      console.error('Ошибка сохранения баланса:', err)
    } finally {
      setSaving(false)
    }
  }

  return {
    selectedMonth,
    setSelectedMonth,
    currentRecord,
    records,
    loading,
    saving,
    saveCurrentScores,
    refresh: fetchRecords,
  }
}
