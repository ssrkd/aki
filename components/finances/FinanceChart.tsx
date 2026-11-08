'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { MonthlyData } from '@/lib/types'

interface FinanceChartProps {
  data: MonthlyData[]
}

export default function FinanceChart({ data }: FinanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} />
        <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}к`} />
        <Tooltip
          formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`]}
          contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" name="Доходы" fill="#0F172A" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="expense" name="Расходы" fill="#94A3B8" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

