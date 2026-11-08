// Утилиты аутентификации

/**
 * Устанавливает сессионную куку в ответе
 * Используется в API routes
 */
export function getSessionCookieOptions() {
  return {
    name: 'aki_session',
    value: 'authenticated',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 30, // 30 дней
      path: '/',
    },
  }
}

/**
 * Генерирует случайный 4-значный OTP код
 * Используется для создания кодов (Telegram бот)
 */
export function generateOtpCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

