'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { usePeople, Person } from '@/hooks/usePeople'
import {
  Users,
  Search,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  Gift,
  Heart,
  MessageCircle,
  Briefcase,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react'

export default function PeoplePage() {
  const { people, loading, addPerson, updatePerson, deletePerson } = usePeople()
  const [filterRelation, setFilterRelation] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [quickInput, setQuickInput] = useState('')
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)

  // Быстрое добавление одной строкой
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickInput.trim()) return

    const raw = quickInput.trim()
    const parts = raw.split(',').map((p) => p.trim())
    const name = parts[0]

    let age: number | undefined
    let city = ''
    let relation = 'friend'

    parts.slice(1).forEach((part) => {
      const ageMatch = part.match(/(\d+)\s*(?:лет|года|год)?/)
      if (ageMatch && !age) {
        age = parseInt(ageMatch[1], 10)
      } else if (['семья', 'брат', 'сестра', 'мама', 'папа'].includes(part.toLowerCase())) {
        relation = 'family'
      } else if (['коллега', 'работа', 'партнер'].includes(part.toLowerCase())) {
        relation = 'colleague'
      } else if (!city) {
        city = part
      }
    })

    await addPerson({
      name,
      age,
      city,
      relation,
      avatar_url: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name)}`,
    })

    setQuickInput('')
  }

  // Расчет тепла связи (сколько дней назад общались)
  const getWarmthInfo = (lastDate?: string) => {
    if (!lastDate) return { color: 'bg-slate-300', text: 'Нет контактов' }
    const diffDays = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 3) return { color: 'bg-emerald-500', text: 'Недавно на связи' }
    if (diffDays <= 14) return { color: 'bg-blue-500', text: `${diffDays} дн. назад` }
    if (diffDays <= 30) return { color: 'bg-amber-500', text: `${diffDays} дн. назад` }
    return { color: 'bg-rose-400', text: 'Давно не общались' }
  }

  const filteredPeople = people.filter((p) => {
    const matchesRel = filterRelation === 'all' || p.relation === filterRelation
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.city && p.city.toLowerCase().includes(search.toLowerCase())) ||
      (p.occupation && p.occupation.toLowerCase().includes(search.toLowerCase()))
    return matchesRel && matchesSearch
  })

  return (
    <AppLayout title="Окружение">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Заголовок страницы */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Окружение
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                {people.length}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Досье на друзей и близких. aki помнит детали и помогает беречь дружбу.
            </p>
          </div>

          {/* Фильтры и поиск */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по имени или городу..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-900 transition-colors w-44 sm:w-56 text-slate-900"
              />
            </div>

            <div className="flex bg-white border border-slate-200 rounded-xl p-0.5 text-xs">
              {[
                { key: 'all', label: 'Все' },
                { key: 'friend', label: 'Друзья' },
                { key: 'family', label: 'Семья' },
                { key: 'colleague', label: 'Коллеги' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterRelation(key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    filterRelation === key
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Быстрое добавление одной строкой */}
        <form onSubmit={handleQuickAdd} className="mb-6">
          <div className="flex items-center bg-white border border-slate-200/90 rounded-2xl p-1.5 shadow-xs focus-within:border-slate-900 transition-all">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 ml-1">
              <Plus size={16} />
            </div>
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Добавить человека... Например: Ансар, 18 лет, Кызылорда, друг"
              className="flex-1 px-3 py-2 text-xs sm:text-sm bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!quickInput.trim()}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-30 transition-all"
            >
              Добавить
            </button>
          </div>
        </form>

        {/* Список карточек людей */}
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">Загрузка карточек...</div>
        ) : filteredPeople.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200/80 p-8">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Users size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Пока нет карточек</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Напиши в поле выше имя друга или расскажи о нём aki AI в чате — досье сформируется автоматически.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPeople.map((person) => {
              const warmth = getWarmthInfo(person.last_contact_date)
              return (
                <div
                  key={person.id}
                  onClick={() => setSelectedPerson(person)}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    {/* Шапка карточки: аватарка + имя + статус */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            person.avatar_url ||
                            `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(person.name)}`
                          }
                          alt={person.name}
                          className="w-12 h-12 rounded-full bg-slate-100 object-cover border border-slate-200/60 p-0.5 group-hover:scale-105 transition-transform"
                        />
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 leading-tight">
                            {person.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-slate-500 font-medium capitalize">
                              {person.relation === 'friend'
                                ? 'Друг'
                                : person.relation === 'family'
                                ? 'Семья'
                                : person.relation === 'colleague'
                                ? 'Коллега'
                                : person.relation}
                            </span>
                            {person.age && (
                              <span className="text-[11px] text-slate-400">· {person.age} лет</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Индикатор тепла связи */}
                      <div
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-[10px] text-slate-600 font-medium"
                        title={warmth.text}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${warmth.color}`} />
                        <span>{warmth.text}</span>
                      </div>
                    </div>

                    {/* Детали: город, работа, заметка */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      {person.city && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                          <span>{person.city}</span>
                        </div>
                      )}
                      {person.occupation && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Briefcase size={12} className="text-slate-400 flex-shrink-0" />
                          <span>{person.occupation}</span>
                        </div>
                      )}
                      {person.notes && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-2 bg-slate-50 p-2 rounded-xl border border-slate-100/80">
                          {person.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Нижняя плашка: кнопка обновили связь */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        updatePerson(person.id, {
                          last_contact_date: new Date().toISOString().split('T')[0],
                        })
                      }}
                      className="text-[11px] text-slate-600 hover:text-slate-900 font-medium hover:underline flex items-center gap-1"
                    >
                      <MessageCircle size={12} />
                      <span>Общались сегодня</span>
                    </button>

                    <span className="text-[11px] text-slate-400 flex items-center gap-0.5 group-hover:text-slate-900 transition-colors">
                      Досье <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Модальное окно полного досье */}
        {selectedPerson && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              {/* Шапка модалки */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      selectedPerson.avatar_url ||
                      `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(selectedPerson.name)}`
                    }
                    alt={selectedPerson.name}
                    className="w-14 h-14 rounded-full bg-slate-100 object-cover border border-slate-200"
                  />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedPerson.name}</h2>
                    <p className="text-xs text-slate-500">
                      {selectedPerson.relation} {selectedPerson.age ? `· ${selectedPerson.age} лет` : ''}{' '}
                      {selectedPerson.city ? `· г. ${selectedPerson.city}` : ''}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPerson(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Поля досье */}
              <div className="space-y-3 text-xs">
                {selectedPerson.birthday && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-700 block mb-0.5">🎂 День рождения</span>
                    <span className="text-slate-600">{selectedPerson.birthday}</span>
                  </div>
                )}

                {selectedPerson.how_met && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-700 block mb-0.5">🤝 История дружбы</span>
                    <span className="text-slate-600">{selectedPerson.how_met}</span>
                  </div>
                )}

                {selectedPerson.tastes && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-700 block mb-0.5">🍕 Вкусы и интересы</span>
                    <span className="text-slate-600">{selectedPerson.tastes}</span>
                  </div>
                )}

                {selectedPerson.important_people && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-700 block mb-0.5">👥 Важные люди в жизни</span>
                    <span className="text-slate-600">{selectedPerson.important_people}</span>
                  </div>
                )}

                {selectedPerson.goals_problems && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-700 block mb-0.5">🎯 Цели и проблемы</span>
                    <span className="text-slate-600">{selectedPerson.goals_problems}</span>
                  </div>
                )}

                {selectedPerson.gifts && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-700 block mb-0.5">🎁 Подарки и идеи</span>
                    <span className="text-slate-600">{selectedPerson.gifts}</span>
                  </div>
                )}

                {selectedPerson.debts_promises && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-700 block mb-0.5">🤝 Обещания и договорённости</span>
                    <span className="text-slate-600">{selectedPerson.debts_promises}</span>
                  </div>
                )}

                {selectedPerson.notes && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-700 block mb-0.5">📝 Заметки</span>
                    <span className="text-slate-600">{selectedPerson.notes}</span>
                  </div>
                )}
              </div>

              {/* Действия внизу модалки */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    if (confirm(`Удалить карточку ${selectedPerson.name}?`)) {
                      deletePerson(selectedPerson.id)
                      setSelectedPerson(null)
                    }
                  }}
                  className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Удалить</span>
                </button>

                <button
                  onClick={() => {
                    updatePerson(selectedPerson.id, {
                      last_contact_date: new Date().toISOString().split('T')[0],
                    })
                    setSelectedPerson({
                      ...selectedPerson,
                      last_contact_date: new Date().toISOString().split('T')[0],
                    })
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors"
                >
                  Отметить общение сегодня
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
