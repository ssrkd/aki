'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import TransactionList from '@/components/finances/TransactionList'
import FinanceChart from '@/components/finances/FinanceChart'
import { useFinances } from '@/hooks/useFinances'
import { Plus } from 'lucide-react'

export default function FinancesPage() {
  const { transactions, monthlyTransactions, summary, monthlyData, addTransaction, deleteTransaction } = useFinances()
  const [quickInput, setQuickInput] = useState('')

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickInput.trim()) return

    // Поддержка: "+5000 Зарплата" или "-1500 Еда Обед" или "1500 такси"
    const isIncome = quickInput.trim().startsWith('+')
    const cleanStr = quickInput.replace(/^[+-]/, '').trim()
    const parts = cleanStr.split(/\s+/)
    const amount = parseFloat(parts[0])

    if (isNaN(amount) || amount <= 0) return

    const category = parts[1] || (isIncome ? 'Доход' : 'Расход')
    const description = parts.slice(2).join(' ') || ''
    const today = new Date().toISOString().split('T')[0]

    await addTransaction(isIncome ? 'income' : 'expense', amount, category, description, today)
    setQuickInput('')
  }

  return (
    <AppLayout title="Финансы" subtitle="Личный бюджет и транзакции">
      {/* Карточки статистики */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-card">
          <p className="text-[11px] text-slate-400 font-medium mb-1">Доходы за месяц</p>
          <p className="text-xl font-bold text-slate-900">+{summary.income.toLocaleString('ru-RU')} ₸</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-card">
          <p className="text-[11px] text-slate-400 font-medium mb-1">Расходы за месяц</p>
          <p className="text-xl font-bold text-slate-900">-{summary.expense.toLocaleString('ru-RU')} ₸</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-card">
          <p className="text-[11px] text-slate-400 font-medium mb-1">Баланс месяца</p>
          <p className={`text-xl font-bold ${summary.balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            {summary.balance > 0 ? '+' : ''}{summary.balance.toLocaleString('ru-RU')} ₸
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-card">
          <p className="text-[11px] text-slate-400 font-medium mb-1">Накопления</p>
          <p className="text-xl font-bold text-slate-900">{summary.savings.toLocaleString('ru-RU')} ₸</p>
        </div>
      </div>

      {/* Быстрое добавление транзакции */}
      <form onSubmit={handleQuickAdd} className="mb-6">
        <input
          type="text"
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          placeholder="+50000 Зарплата или -1500 Еда Обед в кафе... Нажмите Enter"
          className="w-full px-4 py-2.5 text-xs rounded-xl border border-dashed border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:border-solid bg-white text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-xs"
        />
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 p-5 shadow-card">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
            Доходы vs Расходы (6 месяцев)
          </h3>
          <FinanceChart data={monthlyData} />
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-card">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            Транзакции ({monthlyTransactions.length})
          </h3>
          <TransactionList transactions={monthlyTransactions} onDelete={deleteTransaction} />
        </div>
      </div>
    </AppLayout>
  )
}
