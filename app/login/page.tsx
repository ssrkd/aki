'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, CheckCircle2, AlertCircle, RefreshCw, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const [otp, setOtp] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)
  const [codeSent, setCodeSent] = useState<boolean | null>(null)
  const [countdown, setCountdown] = useState(0)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  // Запрос кода в Telegram при открытии страницы
  useEffect(() => {
    handleRequestCode(true)
  }, [])

  // Таймер повторной отправки
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const handleRequestCode = async (isInitial = false) => {
    if (isRequesting || (countdown > 0 && !isInitial)) return
    setIsRequesting(true)
    setError('')

    try {
      const res = await fetch('/api/auth/request-code', { method: 'POST' })
      const data = await res.json()

      if (data.success && data.sent) {
        setCodeSent(true)
        setCountdown(45) // 45 секунд таймер повтора
      } else {
        // Бот еще не знает пользователя
        setCodeSent(false)
      }
    } catch {
      if (!isInitial) {
        setError('Не удалось запросить код')
      }
    } finally {
      setIsRequesting(false)
    }
  }

  const handleChange = (index: number, value: string) => {
    // Принимаем только цифры
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    setError('')

    // Автопереход к следующему полю
    if (value && index < 3) {
      inputs.current[index + 1]?.focus()
    }

    // Если все 4 цифры введены — мгновенно проверяем
    if (index === 3 && value && newOtp.every((d) => d)) {
      handleVerify(newOtp.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pasted.length === 4) {
      const newOtp = pasted.split('')
      setOtp(newOtp)
      inputs.current[3]?.focus()
      handleVerify(pasted)
    }
  }

  const handleVerify = async (code: string) => {
    if (isLoading) return
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        router.push('/habits')
      } else {
        setError(data.error || 'Неверный или истёкший код')
        setOtp(['', '', '', ''])
        inputs.current[0]?.focus()
      }
    } catch {
      setError('Ошибка соединения с сервером')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-[#EEF2FF] to-[#F1F5F9] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Декоративные фоновые элементы */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-500/5 border border-white/80 p-8 sm:p-10 transition-all">
          
          {/* Верхняя шапка с логотипом */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg shadow-indigo-500/15 mb-4 transform hover:scale-105 transition-transform border border-slate-200">
              <img src="/photo/aki.webp" alt="aki" className="w-full h-full object-cover" />
            </div>
            
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight">aki AI</h1>
            </div>
            <p className="text-sm text-[#6B7280] mt-1.5">
              Безопасный вход через Telegram
            </p>
          </div>

          {/* Информационный бейдж о статусе кода */}
          {codeSent === true ? (
            <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-emerald-900">Код отправлен в Telegram!</p>
                <p className="text-emerald-700/90 text-[11px] mt-0.5">Проверьте сообщения от бота</p>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[#1e293b] text-xs flex items-start gap-2.5">
              <Send size={18} className="text-[#3B4FDE] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-indigo-950">Код генерируется через Telegram</p>
                <p className="text-[#64748b] text-[11px] mt-0.5">
                  Нажмите кнопку ниже или напишите боту в Telegram любое сообщение.
                </p>
              </div>
            </div>
          )}

          {/* OTP поля */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-center text-[#4B5563] mb-3 uppercase tracking-wider">
              Введите 4-значный код
            </label>
            <div className="flex gap-3 justify-center" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  autoFocus={i === 0}
                  disabled={isLoading}
                  className={`
                    w-14 h-16 sm:w-16 sm:h-18 text-center text-3xl font-bold rounded-2xl border-2
                    bg-slate-50/60 text-[#111827] outline-none transition-all duration-200
                    focus:bg-white focus:border-[#3B4FDE] focus:ring-4 focus:ring-indigo-500/10 focus:scale-105
                    disabled:opacity-50
                    ${error ? 'border-red-400 bg-red-50/40 text-red-600' : 'border-slate-200 hover:border-slate-300'}
                  `}
                />
              ))}
            </div>
          </div>

          {/* Сообщение об ошибке */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs flex items-center justify-center gap-2">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Кнопка войти (если все 4 цифры введены) */}
          <button
            onClick={() => handleVerify(otp.join(''))}
            disabled={isLoading || otp.some((d) => !d)}
            className={`
              w-full py-3.5 px-4 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2
              transition-all duration-200 shadow-md shadow-indigo-500/20 mb-4
              ${otp.every((d) => d) && !isLoading
                ? 'bg-[#3B4FDE] hover:bg-[#2d3fb5] hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.99]'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'}
            `}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Проверка кода...</span>
              </>
            ) : (
              <span>Войти в систему</span>
            )}
          </button>

          {/* Кнопка повторной отправки */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => handleRequestCode(false)}
              disabled={isRequesting || countdown > 0}
              className="w-full py-2 text-xs text-slate-500 hover:text-[#3B4FDE] disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw size={12} className={isRequesting ? 'animate-spin' : ''} />
              {countdown > 0 ? (
                <span>Отправить повторно через {countdown} сек</span>
              ) : (
                <span>Запросить новый код в Telegram</span>
              )}
            </button>
          </div>

          {/* Подвал с безопасностью */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>Одноразовый код действителен 10 минут</span>
          </div>

        </div>
      </div>
    </div>
  )
}
