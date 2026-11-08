'use client'

import { Note } from '@/lib/types'
import { FileText, Trash2 } from 'lucide-react'

interface NoteCardProps {
  note: Note
  isSelected: boolean
  onSelect: (note: Note) => void
  onDelete: (id: string) => void
}

export default function NoteCard({ note, isSelected, onSelect, onDelete }: NoteCardProps) {
  return (
    <div
      onClick={() => onSelect(note)}
      className={`
        px-3 py-2.5 rounded-lg cursor-pointer group
        transition-all duration-150
        ${isSelected ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <FileText size={14} className={`mt-0.5 flex-shrink-0 ${isSelected ? 'text-[#3B4FDE]' : 'text-[#6B7280]'}`} />
          <div className="min-w-0">
            <p className={`text-xs font-medium truncate ${isSelected ? 'text-[#3B4FDE]' : 'text-[#111827]'}`}>
              {note.title}
            </p>
            {note.content && (
              <p className="text-xs text-[#6B7280] truncate mt-0.5">{note.content.slice(0, 60)}</p>
            )}
            <p className="text-xs text-gray-300 mt-1">
              {new Date(note.updated_at).toLocaleDateString('ru-RU')}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(note.id) }}
          className="p-1 rounded text-transparent group-hover:text-[#6B7280] hover:text-red-500 transition-colors flex-shrink-0"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

