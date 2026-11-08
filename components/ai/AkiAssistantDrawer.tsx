'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X,
  Send,
  Trash2,
  CheckCircle2,
  Sparkles,
  Brain,
  MessageSquare,
  Settings,
  Plus,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Cpu,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions?: { tool: string; details: string; success: boolean }[]
  provider?: string
}

interface Thought {
  id: string
  category: 'self' | 'friends' | 'work' | 'principles'
  content: string
  created_at?: string
}

const CATEGORIES: { key: Thought['category'] | 'all'; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'self', label: 'Обо мне' },
  { key: 'friends', label: 'Друзья' },
  { key: 'work', label: 'Работа' },
  { key: 'principles', label: 'Принципы' },
]

export default function AkiAssistantDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'thoughts' | 'settings'>('chat')
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedThoughtCat, setSelectedThoughtCat] = useState<Thought['category'] | 'all'>('all')
  const [newThoughtText, setNewThoughtText] = useState('')
  const [newThoughtCategory, setNewThoughtCategory] = useState<Thought['category']>('self')
  const [isReflecting, setIsReflecting] = useState(false)
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [hasUnreadThoughts, setHasUnreadThoughts] = useState(false)

  // Сохраненная история чата
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Привет, Серик! Я aki AI.\n\nПомогаю вести трекер, раскладывать цели по полочкам и фиксировать важное. Чем займёмся?',
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Загрузка сообщений из localStorage при старте
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aki_chat_messages')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
        }
      }
    } catch {
      // fallback
    }
  }, [])

  // Сохранение сообщений в localStorage
  useEffect(() => {
    try {
      if (messages.length > 1) {
        localStorage.setItem('aki_chat_messages', JSON.stringify(messages))
      }
    } catch {
      // fallback
    }
  }, [messages])

  // Загрузка «мыслей аки»
  const fetchThoughts = async () => {
    try {
      const res = await fetch('/api/ai/thoughts')
      const data = await res.json()
      if (data.thoughts && Array.isArray(data.thoughts)) {
        setThoughts(data.thoughts)
        const seenCount = parseInt(localStorage.getItem('aki_seen_thoughts_count') || '0', 10)
        if (activeTab === 'thoughts') {
          localStorage.setItem('aki_seen_thoughts_count', data.thoughts.length.toString())
          setHasUnreadThoughts(false)
        } else if (data.thoughts.length > seenCount) {
          setHasUnreadThoughts(true)
        } else {
          setHasUnreadThoughts(false)
        }
      }
    } catch {
      // fallback
    }
  }

  // Загружаем мысли при открытии виджета или смене вкладки
  useEffect(() => {
    if (isOpen) {
      fetchThoughts()
    }
  }, [isOpen, activeTab])

  // Когда пользователь переключается на вкладку thoughts — сбрасываем уведомление
  const handleSelectThoughtsTab = () => {
    setActiveTab('thoughts')
    localStorage.setItem('aki_seen_thoughts_count', thoughts.length.toString())
    setHasUnreadThoughts(false)
  }

  // Слушатель открытия (Cmd+J / Ctrl+J или событие)
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true)
      setTimeout(() => inputRef.current?.focus(), 150)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
        setTimeout(() => inputRef.current?.focus(), 150)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('open-aki-ai', handleOpen)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('open-aki-ai', handleOpen)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, activeTab])

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim()
    if (!prompt || isLoading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
    }

    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setIsLoading(true)

    try {
      const payload = updated
        .filter((m) => m.id !== 'welcome')
        .slice(-16)
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      })

      const data = await res.json()

      if (res.ok && data.reply) {
        // Убираем ** из текста
        const cleanReply = data.reply.replace(/\*\*/g, '').trim()
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: cleanReply,
          actions: data.actions || [],
          provider: data.provider,
        }
        setMessages((prev) => [...prev, assistantMsg])

        if (data.actions && data.actions.length > 0) {
          window.dispatchEvent(new CustomEvent('aki-db-changed'))
          fetchThoughts()
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.error || 'Ошибка при ответе aki AI.',
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Ошибка соединения с aki AI.',
        },
      ])
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  // Сформировать новую мысль (экономно по токенам)
  const handleReflect = async () => {
    if (isReflecting) return
    setIsReflecting(true)
    try {
      const res = await fetch('/api/ai/thoughts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reflect' }),
      })
      const data = await res.json()
      if (data.success) {
        await fetchThoughts()
      }
    } finally {
      setIsReflecting(false)
    }
  }

  // Ручное добавление мысли
  const handleAddThought = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newThoughtText.trim()) return

    const res = await fetch('/api/ai/thoughts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: newThoughtCategory,
        content: newThoughtText.trim(),
      }),
    })
    const data = await res.json()
    if (data.success) {
      setNewThoughtText('')
      fetchThoughts()
    }
  }

  // Удаление мысли
  const handleDeleteThought = async (id: string) => {
    setThoughts((prev) => prev.filter((t) => t.id !== id))
    await fetch(`/api/ai/thoughts?id=${id}`, { method: 'DELETE' })
  }

  const handleClearHistory = () => {
    const init: Message[] = [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'История очищена. Чем могу помочь?',
      },
    ]
    setMessages(init)
    localStorage.removeItem('aki_chat_messages')
  }

  const filteredThoughts =
    selectedThoughtCat === 'all'
      ? thoughts
      : thoughts.filter((t) => t.category === selectedThoughtCat)

  return (
    <>
      {/* Мини-кружок аватарки в правом нижнем углу экрана */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 rounded-full p-1 bg-white border border-slate-200/80 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
        title="aki AI (Cmd+J)"
      >
        <div className="relative">
          <img
            src="/photo/aki.webp"
            alt="aki"
            className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-900/10 group-hover:ring-slate-900/30 transition-all"
          />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-slate-900 border-2 border-white rounded-full flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          </span>
        </div>
      </button>

      {/* Компактный всплывающий виджет */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-[390px] sm:w-[420px] max-w-[calc(100vw-24px)] h-[560px] max-h-[calc(100vh-100px)] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Шапка виджета с переключением вкладок */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 select-none">
            <div className="flex items-center gap-2.5">
              <img
                src="/photo/aki.webp"
                alt="aki"
                className="w-7 h-7 rounded-full object-cover border border-slate-200"
              />
              <div>
                <h3 className="text-xs font-bold text-slate-900 leading-none">aki AI</h3>
                <span className="text-[10px] text-slate-400 font-mono">личный советник</span>
              </div>
            </div>

            {/* Вкладки: Чат / Мысль аки / Настройки */}
            <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  activeTab === 'chat'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Чат
              </button>
              <button
                onClick={handleSelectThoughtsTab}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'thoughts'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>мысль аки</span>
                {hasUnreadThoughts && activeTab !== 'thoughts' && (
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`p-1 rounded-md text-[11px] transition-all ${
                  activeTab === 'settings'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Настройки"
              >
                <Settings size={13} />
              </button>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* ВКЛАДКА 1: ЧАТ */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30">
              {/* Список сообщений */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs leading-relaxed">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.role === 'assistant' && (
                      <img
                        src="/photo/aki.webp"
                        alt="aki"
                        className="w-5 h-5 rounded-full object-cover mt-0.5 border border-slate-200 flex-shrink-0"
                      />
                    )}

                    <div className={`max-w-[85%] ${m.role === 'user' ? 'order-1' : 'order-2'}`}>
                      <div
                        className={`p-2.5 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-slate-900 text-white rounded-br-xs shadow-xs'
                            : 'bg-white text-slate-800 rounded-bl-xs border border-slate-200/80 shadow-xs'
                        }`}
                      >
                        {m.content}
                      </div>

                      {/* Действия с базой */}
                      {m.actions && m.actions.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {m.actions.map((act, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-700 font-medium"
                            >
                              <CheckCircle2 size={11} className="text-slate-900 flex-shrink-0" />
                              <span className="truncate">{act.details}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-2 items-center text-slate-400 text-xs">
                    <img src="/photo/aki.webp" alt="aki" className="w-5 h-5 rounded-full object-cover animate-pulse" />
                    <span className="text-[11px]">aki думает...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Поле ввода сообщения */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-1.5"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Напишите aki AI..."
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white transition-colors"
                >
                  <Send size={13} />
                </button>
              </form>
            </div>
          )}

          {/* ВКЛАДКА 2: МЫСЛЬ АКИ (Блокнот памяти и наблюдений) */}
          {activeTab === 'thoughts' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/40">
              {/* Верхняя панель генерации мысли */}
              <div className="p-3 border-b border-slate-100 bg-white flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">мысль аки</h4>
                  <p className="text-[10px] text-slate-400">Что aki знает и думает о вас</p>
                </div>

                <button
                  onClick={handleReflect}
                  disabled={isReflecting}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[11px] font-medium transition-colors"
                >
                  <Sparkles size={11} className={isReflecting ? 'animate-spin' : ''} />
                  <span>{isReflecting ? 'Анализирую...' : 'Новая мысль'}</span>
                </button>
              </div>

              {/* Фильтры категорий */}
              <div className="px-3 py-2 flex gap-1 border-b border-slate-100 bg-white/60 overflow-x-auto no-scrollbar">
                {CATEGORIES.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedThoughtCat(key)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors flex-shrink-0 ${
                      selectedThoughtCat === key
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Список мыслей */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredThoughts.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-xs text-slate-400">В этой категории пока нет записей.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Нажмите «Новая мысль» или запишите факт вручную ниже.
                    </p>
                  </div>
                ) : (
                  filteredThoughts.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between gap-2 group"
                    >
                      <div>
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 mr-1.5">
                          {t.category === 'self'
                            ? 'Обо мне'
                            : t.category === 'friends'
                            ? 'Друзья'
                            : t.category === 'work'
                            ? 'Работа'
                            : 'Принцип'}
                        </span>
                        <span className="text-xs text-slate-800 leading-relaxed">
                          {t.content}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteThought(t.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                        title="Удалить"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Добавить факт / заметку вручную */}
              <form onSubmit={handleAddThought} className="p-2.5 bg-white border-t border-slate-100 flex gap-1.5">
                <select
                  value={newThoughtCategory}
                  onChange={(e) => setNewThoughtCategory(e.target.value as any)}
                  className="px-2 py-1.5 text-[10px] bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-700"
                >
                  <option value="self">Обо мне</option>
                  <option value="friends">Друзья</option>
                  <option value="work">Работа</option>
                  <option value="principles">Принцип</option>
                </select>
                <input
                  type="text"
                  value={newThoughtText}
                  onChange={(e) => setNewThoughtText(e.target.value)}
                  placeholder="+ Записать факт о Серике..."
                  className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={!newThoughtText.trim()}
                  className="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs disabled:opacity-30"
                >
                  <Plus size={13} />
                </button>
              </form>
            </div>
          )}

          {/* ВКЛАДКА 3: НАСТРОЙКИ */}
          {activeTab === 'settings' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-slate-50/30">
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs space-y-2">
                <h4 className="font-bold text-slate-900">Режим и модели</h4>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600">Основной движок</span>
                  <span className="font-mono text-emerald-600 font-medium">Groq (мгновенный)</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600">Резерв 1</span>
                  <span className="font-mono text-slate-500">Gemini 3.8 Flash</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-600">Резерв 2</span>
                  <span className="font-mono text-slate-500">OpenRouter</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs space-y-2">
                <h4 className="font-bold text-slate-900">Память и данные</h4>
                <p className="text-[11px] text-slate-500">
                  История диалога сохраняется на вашем устройстве, а мысли и правила aki AI фиксируются в Supabase.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleClearHistory}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-700 hover:text-red-600 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={12} />
                    <span>Очистить историю диалога</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </>
  )
}
