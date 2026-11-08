'use client'

import { useEffect, useState } from 'react'
import { Note } from '@/lib/types'
import { Save } from 'lucide-react'

interface NoteEditorProps {
  note: Note
  onUpdate: (id: string, updates: Partial<Note>) => Promise<boolean>
}

export default function NoteEditor({ note, onUpdate }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Синхронизируем при смене заметки
  useEffect(() => {
    setTitle(note.title)
    setContent(note.content || '')
    setIsDirty(false)
  }, [note.id, note.title, note.content])

  // Автосохранение с задержкой
  useEffect(() => {
    if (!isDirty) return
    const timer = setTimeout(async () => {
      setIsSaving(true)
      await onUpdate(note.id, { title, content })
      setIsSaving(false)
      setIsDirty(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [title, content, isDirty, note.id, onUpdate])

  const handleTitleChange = (val: string) => {
    setTitle(val)
    setIsDirty(true)
  }

  const handleContentChange = (val: string) => {
    setContent(val)
    setIsDirty(true)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Заголовок с индикатором сохранения */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="text-base font-semibold text-[#111827] bg-transparent focus:outline-none flex-1"
          placeholder="Заголовок заметки"
        />
        <div className="flex items-center gap-1 text-xs text-[#6B7280]">
          {isSaving ? (
            <>
              <Save size={12} className="animate-pulse" />
              <span>Сохранение...</span>
            </>
          ) : isDirty ? (
            <span className="text-orange-400">Несохранённые изменения</span>
          ) : (
            <span>Сохранено</span>
          )}
        </div>
      </div>

      {/* Редактор */}
      <textarea
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder="Начните печатать..."
        className="flex-1 px-6 py-4 text-sm text-[#111827] bg-transparent resize-none focus:outline-none leading-relaxed"
      />
    </div>
  )
}

