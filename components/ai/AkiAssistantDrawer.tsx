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
  History,
  Check,
} from 'lucide-react'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions?: { tool: string; details: string; success: boolean }[]
  provider?: string
}

export interface ChatSession {
  id: string
  title: string
  created_at: number
  messages: Message[]
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

const defaultWelcomeMessage: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Привет, Серик! Я aki AI.\n\nПомогаю вести блокнот, досье друзей и раскладывать мысли по полочкам. Чем займёмся?',
}

const createNewSession = (title = 'Новый чат'): ChatSession => ({
  id: 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
  title,
  created_at: Date.now(),
  messages: [
    {
      id: 'welcome_' + Date.now(),
      role: 'assistant',
      content:
        'Привет, Серик! Открыт новый диалог. Что обсудим, какую мысль запишем или какой совет нужен?',
    },
  ],
})

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

  // Мульти-сессии чатов
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: 'main',
      title: 'Основной диалог',
      created_at: Date.now(),
      messages: [defaultWelcomeMessage],
    },
  ])
  const [currentSessionId, setCurrentSessionId] = useState<string>('main')
  const [showSessionsList, setShowSessionsList] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 1. Загрузка сессий чатов из localStorage при старте
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aki_chat_sessions_v4')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed)
          const lastActiveId = localStorage.getItem('aki_active_session_id_v4')
          if (lastActiveId && parsed.some((s: ChatSession) => s.id === lastActiveId)) {
            setCurrentSessionId(lastActiveId)
          } else {
            setCurrentSessionId(parsed[0].id)
          }
        }
      }
    } catch {}
  }, [])

  // Сохранение сессий при изменении
  const saveSessions = (updated: ChatSession[], activeId?: string) => {
    setSessions(updated)
    try {
      localStorage.setItem('aki_chat_sessions_v4', JSON.stringify(updated))
      if (activeId) {
        setCurrentSessionId(activeId)
        localStorage.setItem('aki_active_session_id_v4', activeId)
      }
    } catch {}
  }

  // Текущая активная сессия и её сообщения
  const currentSession =
    sessions.find((s) => s.id === currentSessionId) || sessions[0] || {
      id: 'main',
      title: 'Диалог',
      created_at: Date.now(),
      messages: [defaultWelcomeMessage],
    }

  const messages = currentSession.messages

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
    } catch {}
  }

  useEffect(() => {
    if (isOpen) {
      fetchThoughts()
    }
  }, [isOpen, activeTab])

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
    if (isOpen && activeTab === 'chat' && !showSessionsList) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, activeTab, showSessionsList])

  // Создать новый чат
  const handleStartNewChat = () => {
    const newSession = createNewSession('Новый чат')
    const updated = [newSession, ...sessions]
    saveSessions(updated, newSession.id)
    setShowSessionsList(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // Переключить чат
  const handleSwitchSession = (sessionId: string) => {
    setCurrentSessionId(sessionId)
    localStorage.setItem('aki_active_session_id_v4', sessionId)
    setShowSessionsList(false)
  }

  // Удалить чат
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (sessions.length <= 1) {
      handleStartNewChat()
      return
    }
    const remaining = sessions.filter((s) => s.id !== sessionId)
    const nextActive = currentSessionId === sessionId ? remaining[0].id : currentSessionId
    saveSessions(remaining, nextActive)
  }

  // Отправка сообщения
  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim()
    if (!prompt || isLoading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
    }

    // Если чат только начат — присваиваем ему заголовок из первых слов сообщения
    let updatedTitle = currentSession.title
    if (currentSession.title === 'Новый чат' || currentSession.title === 'Основной диалог') {
      updatedTitle = prompt.length > 25 ? prompt.slice(0, 25).trim() + '...' : prompt
    }

    const updatedMessages = [...currentSession.messages, userMsg]

    // Сохраняем состояние с сообщением пользователя
    const updatedSessionsWithUser = sessions.map((s) =>
      s.id === currentSession.id ? { ...s, title: updatedTitle, messages: updatedMessages } : s
    )
    saveSessions(updatedSessionsWithUser, currentSession.id)

    setInput('')
    setIsLoading(true)

    try {
      const payload = updatedMessages
        .filter((m) => !m.id.startsWith('welcome'))
        .slice(-16)
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      })

      const data = await res.json()

      if (res.ok && data.reply) {
        const cleanReply = data.reply.replace(/\*\*/g, '').trim()
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: cleanReply,
          actions: data.actions || [],
          provider: data.provider,
        }

        const finalMessages = [...updatedMessages, assistantMsg]
        const finalSessions = sessions.map((s) =>
          s.id === currentSession.id ? { ...s, title: updatedTitle, messages: finalMessages } : s
        )
        saveSessions(finalSessions, currentSession.id)

        if (data.actions && data.actions.length > 0) {
          window.dispatchEvent(new CustomEvent('aki-db-changed'))
          fetchThoughts()
        }
      } else {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.error || 'Ошибка при ответе aki AI.',
        }
        const finalMessages = [...updatedMessages, errorMsg]
        saveSessions(
          sessions.map((s) => (s.id === currentSession.id ? { ...s, messages: finalMessages } : s)),
          currentSession.id
        )
      }
    } catch {
      const connErrorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Ошибка соединения с сервером aki AI.',
      }
      saveSessions(
        sessions.map((s) =>
          s.id === currentSession.id ? { ...s, messages: [...updatedMessages, connErrorMsg] } : s
        ),
        currentSession.id
      )
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  // Генерация мысли аки
  const handleReflect = async () => {
    if (isReflecting) return
    setIsReflecting(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content:
                'Сделай краткое психологическое наблюдение о Серике на основе того, что ты о нём знаешь. Сохрани через add_thought в категорию self, friends, work или principles.',
            },
          ],
        }),
      })
      if (res.ok) {
        await fetchThoughts()
        window.dispatchEvent(new CustomEvent('aki-db-changed'))
      }
    } catch {} finally {
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

  // Полная очистка всех диалогов (в Настройках)
  const handleClearAllHistory = async () => {
    const freshSession = createNewSession('Основной диалог')
    saveSessions([freshSession], freshSession.id)
    localStorage.removeItem('aki_chat_messages')
    try {
      await fetch('/api/ai/chat', { method: 'DELETE' })
    } catch {}
    setActiveTab('chat')
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
          <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 select-none">
            <div className="flex items-center gap-2">
              <img
                src="/photo/aki.webp"
                alt="aki"
                className="w-7 h-7 rounded-full object-cover border border-slate-200 flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-900 leading-none">aki AI</h3>
                  {activeTab === 'chat' && (
                    <span className="text-[10px] text-slate-500 font-medium truncate max-w-[90px]">
                      • {currentSession.title}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">советник и друг</span>
              </div>
            </div>

            {/* Вкладки: Чат / Мысль аки / Настройки */}
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-0.5 bg-slate-200/60 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => {
                    setActiveTab('chat')
                    setShowSessionsList(false)
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                    activeTab === 'chat'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Чат
                </button>
                <button
                  onClick={handleSelectThoughtsTab}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 ${
                    activeTab === 'thoughts'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>мысль</span>
                  {hasUnreadThoughts && activeTab !== 'thoughts' && (
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setActiveTab('settings')
                    setShowSessionsList(false)
                  }}
                  className={`p-1 rounded-md text-[11px] transition-all ${
                    activeTab === 'settings'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Настройки"
                >
                  <Settings size={13} />
                </button>
              </div>

              {/* Кнопки управления чатом: Список диалогов и Новый чат */}
              {activeTab === 'chat' && (
                <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                  <button
                    onClick={() => setShowSessionsList(!showSessionsList)}
                    className={`p-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                      showSessionsList
                        ? 'bg-slate-200 text-slate-900 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                    title="Все диалоги"
                  >
                    <History size={13} />
                  </button>

                  <button
                    onClick={handleStartNewChat}
                    className="p-1.5 rounded-lg text-slate-700 bg-white hover:bg-slate-100 border border-slate-200/80 shadow-2xs transition-all"
                    title="Новый диалог"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors ml-0.5"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ВЫПАДАЮЩАЯ ПАНЕЛЬ СПИСКА ДИАЛОГОВ */}
          {activeTab === 'chat' && showSessionsList && (
            <div className="p-3 bg-slate-50/80 border-b border-slate-200 max-h-[220px] overflow-y-auto space-y-1.5 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-1 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                <span>Твои диалоги ({sessions.length})</span>
              </div>

              {sessions.map((sess) => {
                const isActive = sess.id === currentSessionId
                return (
                  <div
                    key={sess.id}
                    onClick={() => handleSwitchSession(sess.id)}
                    className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      isActive
                        ? 'bg-white text-slate-900 border-2 border-slate-800 shadow-xs font-semibold'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare size={13} className={isActive ? 'text-slate-900' : 'text-slate-400'} />
                      <span className="truncate text-xs">{sess.title}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isActive && <Check size={12} className="text-emerald-600 mr-1" />}
                      <button
                        onClick={(e) => handleDeleteSession(sess.id, e)}
                        className={`p-1 rounded transition-colors ${
                          isActive ? 'text-slate-400 hover:text-red-500' : 'text-slate-400 hover:text-red-500'
                        }`}
                        title="Удалить диалог"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

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
                    <span className="text-[11px]">aki думает и формирует совет...</span>
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
                className="p-2.5 bg-white border-t border-slate-100 flex items-end gap-1.5"
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value)
                    // Авто-высота: растёт вниз, но не больше 5 строк
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Напишите aki AI... (Enter — отправить)"
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 transition-colors resize-none overflow-hidden min-h-[34px]"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white transition-colors flex-shrink-0"
                >
                  <Send size={13} />
                </button>
              </form>
            </div>
          )}

          {/* ВКЛАДКА 2: МЫСЛЬ АКИ (Блокнот памяти и наблюдений) */}
          {activeTab === 'thoughts' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/40">
              {/* Верхняя панель */}
              <div className="p-3 border-b border-slate-100 bg-white flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">мысль аки</h4>
                  <p className="text-[10px] text-slate-400">Накопленные знания и память о тебе</p>
                </div>
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

              {/* Список мыслей с ЧЁТКИМ РАЗДЕЛЕНИЕМ КАТЕГОРИИ И ТЕКСТА */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredThoughts.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-xs text-slate-400">В этой категории пока нет записей.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Расскажите aki AI что-нибудь о себе в чате.
                    </p>
                  </div>
                ) : (
                  filteredThoughts.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white p-3 rounded-xl border border-slate-100 shadow-2xs flex items-start justify-between gap-2.5 group hover:border-slate-200 transition-all"
                    >
                      <div className="flex-1 space-y-1">
                        <div>
                          <span
                            className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded-md font-semibold tracking-wider inline-block ${
                              t.category === 'self'
                                ? 'bg-blue-50 text-blue-700'
                                : t.category === 'friends'
                                ? 'bg-emerald-50 text-emerald-700'
                                : t.category === 'principles'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {t.category === 'self'
                              ? 'Обо мне'
                              : t.category === 'friends'
                              ? 'Друзья'
                              : t.category === 'work'
                              ? 'Работа'
                              : 'Принцип'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed font-normal">
                          {t.content.replace(/^(?:Друг|Обо мне|Работа|Принцип|Друзья):\s*/i, '')}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteThought(t.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                        title="Удалить"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Добавить факт вручную — УБРАНО по запросу */}
            </div>
          )}

          {/* ВКЛАДКА 3: НАСТРОЙКИ */}
          {activeTab === 'settings' && (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto text-xs bg-slate-50/30">
              <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <Cpu size={16} className="text-slate-700" />
                  <h4 className="font-bold text-slate-900">Искусственный интеллект</h4>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  aki AI работает с автоматическим переключением провайдеров для 100% стабильности:
                </p>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                  <span className="text-slate-600">Основной:</span>
                  <span className="font-mono text-slate-900 font-semibold">Groq (Llama / Qwen)</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Резерв 1:</span>
                  <span className="font-mono text-slate-700">Google Gemini</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Резерв 2:</span>
                  <span className="font-mono text-slate-500">OpenRouter</span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs space-y-2">
                <h4 className="font-bold text-slate-900">Память и данные</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Диалоги сохраняются изолированно по сессиям на твоем устройстве, а ключевые факты и знания aki AI бережно фиксируются в облачной базе.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleClearAllHistory}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-700 hover:text-red-600 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={12} />
                    <span>Очистить историю всех диалогов</span>
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
