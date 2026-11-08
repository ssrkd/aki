'use client'

import { Achievement, AchievementCategory } from '@/lib/types'
import Badge from '@/components/ui/Badge'
import { Trash2, Calendar } from 'lucide-react'

interface AchievementCardProps {
  achievement: Achievement
  onDelete: (id: string) => void
}

const categoryConfig: Record<AchievementCategory, { label: string; variant: 'blue' | 'green' | 'gray' | 'yellow' }> = {
  personal: { label: 'Личное', variant: 'blue' },
  professional: { label: 'Профессиональное', variant: 'yellow' },
  health: { label: 'Здоровье', variant: 'green' },
  other: { label: 'Другое', variant: 'gray' },
}

export default function AchievementCard({ achievement, onDelete }: AchievementCardProps) {
  const { label, variant } = categoryConfig[achievement.category]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-card p-4 group relative">
      {/* Временная метка слева */}
      <div className="flex items-center gap-1 text-xs text-[#6B7280] mb-2">
        <Calendar size={12} />
        <span>
          {new Date(achievement.achieved_at).toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'long', year: 'numeric'
          })}
        </span>
      </div>

      <h4 className="text-sm font-semibold text-[#111827] mb-1">{achievement.title}</h4>
      {achievement.description && (
        <p className="text-xs text-[#6B7280] mb-3">{achievement.description}</p>
      )}

      <div className="flex items-center justify-between">
        <Badge variant={variant}>{label}</Badge>
        <button
          onClick={() => onDelete(achievement.id)}
          className="p-1 rounded text-transparent group-hover:text-[#6B7280] hover:text-red-500 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

