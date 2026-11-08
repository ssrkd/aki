'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  X,
  Send,
  Trash2,
  CheckCircle2,
  Bot,
  User,
  ArrowRight,
  Database,
  Cpu,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions?: { tool: string; details: string; success: boolean }[]
  provider?: string
}

const SUGGESTIONS = [
  'Разложи мои цели по полочкам и оцени приоритеты',
  'Добавь позитивную привычку: читать 20 мин в день',
  'Запиши расход: 4500 на продукты',
  'Создай план на эту неделю с 3 задачами',
  'Запомни: я люблю тренироваться по утрам',
]

export default function AkiAssistantDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Привет, Серик! Я — **aki AI**.\n\nУ меня полный доступ к твоим целям, привычкам, финансам и планам. Могу раскладывать всё по полочкам, анализировать твой прогресс или напрямую выполнять действия с базой данных.\n\nЧем займёмся сегодня?',
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Слушатель события открытия из Header, Sidebar или горячей клавиши Cmd+J / Ctrl+J
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

  // Автоскролл к последнему сообщению
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim()
    if (!prompt || isLoading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
    }

    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      // Отправляем контекст последних сообщений
      const apiPayload = updatedMessages
        .filter((m) => m.id !== 'welcome')
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiPayload }),
      })

      const data = await res.json()

      if (res.ok && data.reply) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          actions: data.actions || [],
          provider: data.provider,
        }
        setMessages((prev) => [...prev, assistantMsg])

        // Если ИИ изменил данные в базе, уведомляем компоненты обновиться
        if (data.actions && data.actions.length > 0) {
          window.dispatchEvent(new CustomEvent('aki-db-changed'))
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.error || 'Произошла ошибка при обращении к ИИ.',
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Ошибка соединения с сервером aki AI.',
        },
      ])
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleClear = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'История очищена. Я готов к новым задачам!',
      },
    ])
  }

  return (
    <>
      {/* Плавающая кнопка вызова в правом нижнем углу */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true)
            setTimeout(() => inputRef.current?.focus(), 150)
          }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-[#3B4FDE] hover:bg-[#2d3fb5] text-white shadow-xl shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all group"
          title="Открыть aki AI (Cmd+J)"
        >
          <Sparkles size={18} className="animate-spin-slow group-hover:rotate-12 transition-transform" />
          <span className="font-semibold text-xs tracking-wide">aki AI</span>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white/90 font-mono">⌘J</span>
        </button>
      )}

      {/* Оверлей затемнения */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 transition-opacity"
        />
      )}

      {/* Боковая панель (Drawer) */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out border-l border-slate-100 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Шапка панели */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3B4FDE] flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">aki AI</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Database size={10} /> Admin DB
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Автономный ассистент с доступом к трекеру</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClear}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-colors"
              title="Очистить диалог"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Закрыть (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Область сообщений */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-[#3B4FDE] flex items-center justify-center text-white flex-shrink-0 mt-1 shadow-sm">
                  <Sparkles size={14} />
                </div>
              )}

              <div className={`max-w-[85%] ${m.role === 'user' ? 'order-1' : 'order-2'}`}>
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#3B4FDE] text-white rounded-br-xs shadow-sm shadow-indigo-500/20'
                      : 'bg-white text-slate-800 rounded-bl-xs border border-slate-200/80 shadow-sm'
                  }`}
                >
                  {m.content}
                </div>

                {/* Выполненные действия с базой */}
                {m.actions && m.actions.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {m.actions.map((act, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-800 font-medium"
                      >
                        <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                        <span>{act.details}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Индикатор модели */}
                {m.provider && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 px-1">
                    <Cpu size={10} />
                    <span>Ответ через {m.provider}</span>
                  </div>
                )}
              </div>

              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-slate-700 flex-shrink-0 mt-1">
                  <User size={14} />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-lg bg-[#3B4FDE] flex items-center justify-center text-white flex-shrink-0">
                <Sparkles size={14} />
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 rounded-bl-xs shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#3B4FDE] animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-[#3B4FDE] animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-[#3B4FDE] animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs text-slate-400 ml-1">aki анализирует данные...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Подсказки быстрых запросов (Chips) */}
        <div className="p-2.5 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar">
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s)}
              disabled={isLoading}
              className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-[#3B4FDE] text-slate-600 transition-colors flex items-center gap-1 flex-shrink-0"
            >
              <span>{s}</span>
              <ArrowRight size={10} />
            </button>
          ))}
        </div>

        {/* Поле ввода */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="p-3.5 bg-white border-t border-slate-100 flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Спросите или поручите задачу aki AI..."
            disabled={isLoading}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3B4FDE] focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-[#3B4FDE] hover:bg-[#2d3fb5] disabled:opacity-40 text-white font-medium text-xs flex items-center justify-center transition-colors shadow-sm"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </>
  )
}

