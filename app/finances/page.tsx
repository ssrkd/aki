'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import TransactionList from '@/components/finances/TransactionList'
import AddTransactionModal from '@/components/finances/AddTransactionModal'
import FinanceChart from '@/components/finances/FinanceChart'
import { useFinances } from '@/hooks/useFinances'
import Button from '@/components/ui/Button'
import { Plus, TrendingUp, TrendingDown, PiggyBank, Wallet } from 'lucide-react'

export default function FinancesPage() {
  const { transactions, monthlyTransactions, summary, monthlyData, addTransaction, deleteTransaction } = useFinances()
  const [modalOpen, setModalOpen] = useState(false)

  const summaryCards = [
    { label: 'Доходы за месяц', value: summary.income, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Расходы за месяц', value: summary.expense, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Накопления', value: summary.savings, icon: PiggyBank, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Баланс', value: summary.balance, icon: Wallet, color: summary.balance >= 0 ? 'text-green-600' : 'text-red-500', bg: 'bg-gray-50' },
  ]

  return (
    <AppLayout title="Финансы" subtitle="Доходы, расходы и накопления">
      {/* Карточки статистики */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {summaryCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-card border border-gray-50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#6B7280]">{label}</p>
              <div className={`p-1.5 rounded-lg ${bg}`}>
                <Icon size={14} className={color} />
              </div>
            </div>
            <p className={`text-xl font-bold ${color}`}>
              {value.toLocaleString('ru-RU')} ₽
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* График */}
        <div className="col-span-3 bg-white rounded-xl shadow-card border border-gray-50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#111827]">Доходы vs Расходы</h3>
            <span className="text-xs text-[#6B7280]">Последние 6 месяцев</span>
          </div>
          <FinanceChart data={monthlyData} />
        </div>

        {/* Транзакции */}
        <div className="col-span-2 bg-white rounded-xl shadow-card border border-gray-50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#111827]">Транзакции за месяц</h3>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <Plus size={14} /> Добавить
            </Button>
          </div>
          <TransactionList transactions={monthlyTransactions} onDelete={deleteTransaction} />
        </div>
      </div>

      {/* Все транзакции */}
      <div className="mt-6 bg-white rounded-xl shadow-card border border-gray-50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#111827]">История транзакций</h3>
        </div>
        <TransactionList transactions={transactions.slice(0, 50)} onDelete={deleteTransaction} />
      </div>

      <AddTransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={addTransaction}
      />
    </AppLayout>
  )
}

