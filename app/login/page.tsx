'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [otp, setOtp] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  const handleChange = (index: number, value: string) => {
    // Принимаем только цифры
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1) // Только последний символ
    setOtp(newOtp)
    setError('')

    // Автопереход к следующему полю
    if (value && index < 3) {
      inputs.current[index + 1]?.focus()
    }

    // Если все 4 цифры введены — отправляем
    if (index === 3 && value && newOtp.every((d) => d)) {
      handleVerify(newOtp.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace — возврат к предыдущему полю
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pasted.length === 4) {
      const newOtp = pasted.split('')
      setOtp(newOtp)
      inputs.current[3]?.focus()
      handleVerify(pasted)
    }
  }

  const handleVerify = async (code: string) => {
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
        setError(data.error || 'Неверный код')
        setOtp(['', '', '', ''])
        inputs.current[0]?.focus()
      }
    } catch {
      setError('Ошибка соединения')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-10 w-full max-w-sm">
        {/* Логотип */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#111827] tracking-tight">aki</h1>
          <p className="text-sm text-[#6B7280] mt-2">Ваш личный трекер</p>
        </div>

        {/* Инструкция */}
        <p className="text-sm text-center text-[#6B7280] mb-6">Введите код из Telegram</p>

        {/* OTP поля */}
        <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
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
              className={`
                w-14 h-14 text-center text-2xl font-bold rounded-xl border-2
                text-[#111827] bg-white
                focus:outline-none focus:border-[#3B4FDE]
                transition-all duration-200
                ${error ? 'border-red-400' : 'border-gray-200'}
                ${isLoading ? 'opacity-50' : ''}
              `}
              disabled={isLoading}
            />
          ))}
        </div>

        {/* Ошибка */}
        {error && (
          <p className="text-sm text-red-500 text-center mb-4">{error}</p>
        )}

        {/* Индикатор загрузки */}
        {isLoading && (
          <div className="flex justify-center">
            <div className="w-5 h-5 border-2 border-[#3B4FDE] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}

