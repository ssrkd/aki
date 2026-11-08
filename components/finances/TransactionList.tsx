'use client'

import { Transaction } from '@/lib/types'
import { Trash2 } from 'lucide-react'

interface TransactionListProps {
  transactions: Transaction[]
  onDelete: (id: string) => void
}

const categoryLabels: Record<string, string> = {
  salary: 'Зарплата',
  freelance: 'Фриланс',
  food: 'Еда',
  transport: 'Транспорт',
  entertainment: 'Развлечения',
  savings: 'Накопления',
  health: 'Здоровье',
  shopping: 'Покупки',
  utilities: 'Коммунальные',
  other: 'Другое',
}

export default function TransactionList({ transactions, onDelete }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[#6B7280]">Нет транзакций за этот период</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {transactions.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 group transition-colors"
        >
          {/* Дата */}
          <span className="text-xs text-[#6B7280] w-20 flex-shrink-0">
            {new Date(t.transaction_date).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
            })}
          </span>

          {/* Категория */}
          <span className="text-xs bg-gray-100 text-[#6B7280] px-2 py-0.5 rounded-md w-28 flex-shrink-0 truncate">
            {categoryLabels[t.category] || t.category}
          </span>

          {/* Описание */}
          <span className="text-sm text-[#111827] flex-1 truncate">
            {t.description || '—'}
          </span>

          {/* Сумма */}
          <span
            className={`text-sm font-semibold flex-shrink-0 ${
              t.type === 'income'
                ? 'text-green-600'
                : t.type === 'savings'
                ? 'text-blue-600'
                : 'text-red-500'
            }`}
          >
            {t.type === 'income' ? '+' : t.type === 'savings' ? '→' : '-'}
            {Number(t.amount).toLocaleString('ru-RU')} ₽
          </span>

          {/* Удалить */}
          <button
            onClick={() => onDelete(t.id)}
            className="p-1 rounded text-transparent group-hover:text-[#6B7280] hover:text-red-500 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

