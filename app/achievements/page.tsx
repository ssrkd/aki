'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import AchievementCard from '@/components/achievements/AchievementCard'
import AddAchievementModal from '@/components/achievements/AddAchievementModal'
import { useAchievements } from '@/hooks/useAchievements'
import Button from '@/components/ui/Button'
import { Plus, Trophy, Star, Zap } from 'lucide-react'

export default function AchievementsPage() {
  const { achievements, stats, addAchievement, deleteAchievement } = useAchievements()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <AppLayout title="Достижения" subtitle="Ваши победы и успехи">
      {/* Статистика */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-card border border-gray-50 flex items-center gap-3">
          <div className="p-2 bg-yellow-50 rounded-lg"><Trophy size={18} className="text-yellow-600" /></div>
          <div><p className="text-xs text-[#6B7280]">Всего достижений</p><p className="text-2xl font-bold text-[#111827]">{stats.total}</p></div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-card border border-gray-50 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg"><Star size={18} className="text-blue-600" /></div>
          <div><p className="text-xs text-[#6B7280]">За этот год</p><p className="text-2xl font-bold text-[#111827]">{stats.thisYear}</p></div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-card border border-gray-50 flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg"><Zap size={18} className="text-green-600" /></div>
          <div><p className="text-xs text-[#6B7280]">За этот месяц</p><p className="text-2xl font-bold text-[#111827]">{stats.thisMonth}</p></div>
        </div>
      </div>

      {/* Кнопка добавления */}
      <div className="flex justify-end mb-5">
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Добавить достижение
        </Button>
      </div>

      {/* Временная лента */}
      {achievements.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-card">
          <p className="text-sm text-[#6B7280]">Нет достижений. Добавьте первое!</p>
        </div>
      ) : (
        <div className="relative">
          {/* Вертикальная линия */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />

          <div className="space-y-4 pl-12">
            {achievements.map((achievement) => (
              <div key={achievement.id} className="relative">
                {/* Точка на линии */}
                <div className="absolute -left-9 top-4 w-3 h-3 rounded-full bg-slate-900 border-2 border-white shadow-xs" />
                <AchievementCard achievement={achievement} onDelete={deleteAchievement} />
              </div>
            ))}
          </div>
        </div>
      )}

      <AddAchievementModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onAdd={addAchievement} />
    </AppLayout>
  )
}

