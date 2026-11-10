'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useNotes } from '@/hooks/useNotes'
import NoteCard from '@/components/notebook/NoteCard'
import NoteEditor from '@/components/notebook/NoteEditor'
import { NoteCategory } from '@/lib/types'
import { Plus, Search, BookMarked, User, Users, Heart, Briefcase, Lightbulb, MoreHorizontal } from 'lucide-react'

const categories: { key: NoteCategory | 'all'; label: string; icon: any }[] = [
  { key: 'all', label: 'Все заметки', icon: BookMarked },
  { key: 'self', label: 'Про себя', icon: User },
  { key: 'friends', label: 'Друзья', icon: Users },
  { key: 'family', label: 'Семья', icon: Heart },
  { key: 'work', label: 'Работа', icon: Briefcase },
  { key: 'ideas', label: 'Идеи', icon: Lightbulb },
  { key: 'other', label: 'Разное', icon: MoreHorizontal },
]

export default function NotebookPage() {
  const {
    notes,
    isLoading,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectedNote,
    setSelectedNote,
    addNote,
    updateNote,
    deleteNote,
  } = useNotes()

  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState<NoteCategory>('self')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    const ok = await addNote(newTitle.trim(), newCategory, '')
    if (ok) {
      setNewTitle('')
      setIsCreating(false)
    }
  }

  return (
    <AppLayout title="Блокнот">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex h-[calc(100vh-140px)]">
        {/* Боковая панель категорий */}
        <div className="w-56 border-r border-gray-100 p-4 flex flex-col justify-between bg-gray-50/50">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-3 py-2">
              Категории
            </p>
            {categories.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                  ${
                    selectedCategory === key
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }
                `}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2 px-3 rounded-lg text-xs font-medium transition-all shadow-xs"
          >
            <Plus size={15} />
            <span>Новая заметка</span>
          </button>
        </div>

        {/* Список заметок */}
        <div className="w-72 border-r border-slate-100 flex flex-col bg-white">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск заметок..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {isCreating && (
            <form onSubmit={handleCreate} className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
              <input
                type="text"
                placeholder="Название заметки..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-900 transition-colors"
              />
              <div className="flex gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as NoteCategory)}
                  className="flex-1 text-xs px-2 py-1 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-900"
                >
                  <option value="self">Про себя</option>
                  <option value="friends">Друзья</option>
                  <option value="family">Семья</option>
                  <option value="work">Работа</option>
                  <option value="ideas">Идеи</option>
                  <option value="other">Разное</option>
                </select>
                <button
                  type="submit"
                  className="bg-slate-900 text-white text-xs px-3 py-1 rounded-md font-medium hover:bg-slate-800 transition-colors"
                >
                  Создать
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-slate-500 text-xs px-2 py-1 hover:text-slate-700"
                >
                  Отмена
                </button>
              </div>
            </form>
          )}

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              <p className="text-xs text-gray-400 text-center py-4">Загрузка...</p>
            ) : notes.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Нет заметок</p>
            ) : (
              notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isSelected={selectedNote?.id === note.id}
                  onSelect={setSelectedNote}
                  onDelete={deleteNote}
                />
              ))
            )}
          </div>
        </div>

        {/* Область редактирования заметки */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedNote ? (
            <NoteEditor note={selectedNote} onUpdate={updateNote} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
              <BookMarked size={48} className="stroke-1 text-gray-300 mb-2" />
              <p className="text-sm">Выберите заметку или создайте новую</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
