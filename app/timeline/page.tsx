'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useTimeline, LifeEvent } from '@/hooks/useTimeline'
import {
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  Trophy,
  Flag,
  Briefcase,
  GraduationCap,
  Heart,
  Home,
  Star,
  Users,
  ChevronRight,
  Filter,
} from 'lucide-react'

const CATEGORIES: { key: string; label: string; icon: any; color: string }[] = [
  { key: 'all', label: 'Все события', icon: Filter, color: 'text-slate-700 bg-slate-100' },
  { key: 'turning_point', label: 'Поворотные моменты', icon: Flag, color: 'text-amber-700 bg-amber-50' },
  { key: 'victory', label: 'Победы', icon: Trophy, color: 'text-emerald-700 bg-emerald-50' },
  { key: 'career', label: 'Карьера и проекты', icon: Briefcase, color: 'text-blue-700 bg-blue-50' },
  { key: 'university', label: 'Университет', icon: GraduationCap, color: 'text-purple-700 bg-purple-50' },
  { key: 'school', label: 'Школа', icon: GraduationCap, color: 'text-indigo-700 bg-indigo-50' },
  { key: 'childhood', label: 'Детство', icon: Star, color: 'text-orange-700 bg-orange-50' },
  { key: 'family', label: 'Семья', icon: Home, color: 'text-rose-700 bg-rose-50' },
  { key: 'relationship', label: 'Отношения', icon: Heart, color: 'text-pink-700 bg-pink-50' },
]

export default function TimelinePage() {
  const { events, loading, addEvent, deleteEvent } = useTimeline()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)

  // Поля формы
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState<LifeEvent['category']>('turning_point')
  const [importance, setImportance] = useState(3)
  const [description, setDescription] = useState('')
  const [peopleNames, setPeopleNames] = useState('')

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    await addEvent({
      title: title.trim(),
      event_date: eventDate,
      category,
      importance,
      description: description.trim(),
      people_names: peopleNames.trim(),
    })

    setTitle('')
    setDescription('')
    setPeopleNames('')
    setShowAddForm(false)
  }

  const filteredEvents = events.filter((e) =>
    selectedCategory === 'all' ? true : e.category === selectedCategory
  )

  const getCategoryMeta = (cat: string) => {
    return CATEGORIES.find((c) => c.key === cat) || CATEGORIES[1]
  }

  return (
    <AppLayout title="История жизни" subtitle="Хроника ключевых вех, побед и поворотных моментов">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Верхняя панель действий */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
            {CATEGORIES.slice(0, 5).map((cat) => {
              const active = selectedCategory === cat.key
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
          >
            <Plus size={14} />
            <span>Записать веху</span>
          </button>
        </div>

        {/* Форма добавления события */}
        {showAddForm && (
          <form
            onSubmit={handleAddSubmit}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-800">Новое событие в историю</h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Отмена
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Заголовок события *
                </label>
                <input
                  type="text"
                  placeholder="Например: Поступил в университет или Первый крупный проект"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Дата события
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Категория
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  {CATEGORIES.filter((c) => c.key !== 'all').map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Важность ({importance} из 5)
                </label>
                <div className="flex items-center gap-1.5 pt-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setImportance(star)}
                      className={`p-1 rounded-md transition-colors ${
                        star <= importance ? 'text-amber-500' : 'text-slate-300'
                      }`}
                    >
                      <Star size={18} fill={star <= importance ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  С кем связано (люди)
                </label>
                <input
                  type="text"
                  placeholder="Ансар, родители..."
                  value={peopleNames}
                  onChange={(e) => setPeopleNames(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Описание, мысли и детали
              </label>
              <textarea
                rows={3}
                placeholder="Что произошло, какие уроки вынес, что изменилось..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-all"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                Сохранить событие
              </button>
            </div>
          </form>
        )}

        {/* Список таймлайна */}
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">Загрузка истории...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-600">
              <Flag size={22} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">Таймлайн пока пуст</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Записывай сюда поворотные моменты жизни, победы, переезды и важные вехи. Ты также можешь надиктовать их aki AI в Telegram!
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-sm"
            >
              <Plus size={14} />
              <span>Добавить первую веху</span>
            </button>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-[11px] sm:before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
            {filteredEvents.map((evt) => {
              const meta = getCategoryMeta(evt.category)
              const Icon = meta.icon
              const year = evt.event_date ? evt.event_date.split('-')[0] : ''
              const formattedDate = evt.event_date
                ? new Date(evt.event_date).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : ''

              return (
                <div key={evt.id} className="relative group">
                  {/* Иконка вехи на вертикальной оси */}
                  <div className="absolute -left-[30px] sm:-left-[35px] top-1.5 w-6 h-6 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center text-slate-900 shadow-sm z-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  </div>

                  {/* Карточка события */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-800">
                            {year} г.
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${meta.color}`}
                          >
                            <Icon size={11} />
                            {meta.label}
                          </span>
                          {evt.importance > 0 && (
                            <div className="flex items-center text-amber-500">
                              {Array.from({ length: evt.importance }).map((_, i) => (
                                <Star key={i} size={11} fill="currentColor" />
                              ))}
                            </div>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 pt-0.5">{evt.title}</h4>
                      </div>

                      <button
                        onClick={() => deleteEvent(evt.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 transition-all rounded-lg hover:bg-slate-50"
                        title="Удалить веху"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {evt.description && (
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {evt.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        <span>{formattedDate}</span>
                      </div>

                      {evt.people_names && (
                        <div className="flex items-center gap-1 text-slate-500 font-medium">
                          <Users size={12} />
                          <span>{evt.people_names}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

