import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-[#111827]">{label}</label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-3 py-2 rounded-lg border
            text-sm text-[#111827] placeholder:text-[#6B7280]
            bg-white
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-[#3B4FDE] focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input

