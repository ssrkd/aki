'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Закрытие по нажатию Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div
        className={`
          relative bg-white rounded-xl shadow-xl w-full mx-4
          ${sizeClasses[size]}
          animate-in fade-in zoom-in-95 duration-200
        `}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-[#111827]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#6B7280] hover:bg-gray-100 hover:text-[#111827] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Контент */}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}
