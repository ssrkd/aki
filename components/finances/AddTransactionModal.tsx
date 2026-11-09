'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { TransactionType } from '@/lib/types'

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (
    type: TransactionType,
    amount: number,
    category: string,
    description: string,
    date: string
  ) => Promise<boolean>
}

const incomeCategories = ['salary', 'freelance', 'other']
const expenseCategories = ['food', 'transport', 'entertainment', 'health', 'shopping', 'utilities', 'other']
const savingsCategories = ['savings', 'investment', 'other']

const categoryLabels: Record<string, string> = {
  salary: 'Зарплата', freelance: 'Фриланс',
  food: 'Еда', transport: 'Транспорт', entertainment: 'Развлечения',
  savings: 'Накопления', health: 'Здоровье', shopping: 'Покупки',
  utilities: 'Коммунальные', investment: 'Инвестиции', other: 'Другое',
}

export default function AddTransactionModal({ isOpen, onClose, onAdd }: AddTransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('food')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isLoading, setIsLoading] = useState(false)

  const categories =
    type === 'income' ? incomeCategories : type === 'savings' ? savingsCategories : expenseCategories

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || isNaN(parseFloat(amount))) return
    setIsLoading(true)
    const success = await onAdd(type, parseFloat(amount), category, description, date)
    setIsLoading(false)
    if (success) {
      setAmount('')
      setDescription('')
      onClose()
    }
  }

  const typeLabels: Record<TransactionType, string> = {
    income: 'Доход',
    expense: 'Расход',
    savings: 'Накопление',
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить транзакцию">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Тип */}
        <div className="flex gap-2">
          {(['income', 'expense', 'savings'] as TransactionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setCategory(t === 'income' ? 'salary' : t === 'savings' ? 'savings' : 'food') }}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                type === t ? 'bg-[#3B4FDE] text-white border-[#3B4FDE]' : 'bg-white text-[#6B7280] border-gray-200'
              }`}
            >
              {typeLabels[t]}
            </button>
          ))}
        </div>

        <Input
          label="Сумма (₸)"
          type="number"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
          step="0.01"
        />

        <div>
          <label className="text-sm font-medium text-[#111827] block mb-1">Категория</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#3B4FDE]"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{categoryLabels[c]}</option>
            ))}
          </select>
        </div>

        <Input
          label="Описание"
          placeholder="Необязательно"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <Input
          label="Дата"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Отмена</Button>
          <Button type="submit" isLoading={isLoading} className="flex-1">Добавить</Button>
        </div>
      </form>
    </Modal>
  )
}

