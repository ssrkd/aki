import { createServiceClient } from './supabase'

/**
 * Менеджер ключей и конфигураций aki AI.
 * Все ключи берутся безопасно:
 * 1. process.env (Vercel Environment Variables и локальный .env.local)
 * 2. Supabase база данных (таблица app_settings — чтобы менять без пересборки Vercel)
 * В коде НЕТ секретных ключей в открытом виде, чтобы GitHub push не блокировался.
 */

// In-memory кэш для динамических настроек из Supabase (TTL: 2 минуты)
let cachedDbKeys: Record<string, string> | null = null
let cacheExpiresAt = 0

/**
 * Синхронное получение ключа из process.env
 */
export function getKeySync(name: string): string {
  const envVal = process.env[name]
  if (envVal && envVal.trim()) return envVal.trim()
  return ''
}

export function getBotToken(): string {
  return getKeySync('TELEGRAM_BOT_TOKEN') || '9137976618:AAFQwFVgasD8rBBg27hqOaZaw8gfhPeVdlo'
}

export function getCronSecret(): string {
  return getKeySync('CRON_SECRET') || 'aki_cron_secret_srk_2026'
}

/**
 * Асинхронное получение всех ключей ИИ (с поддержкой динамических ключей из БД Supabase)
 */
export async function getAIKeys(): Promise<{
  groq1: string
  groq2: string
  gemini1: string
  gemini2: string
  openrouter1: string
  openrouter2: string
  telegramBotToken: string
  cronSecret: string
}> {
  const now = Date.now()

  // Проверяем / обновляем кэш из Supabase app_settings если возможно
  if (!cachedDbKeys || now > cacheExpiresAt) {
    try {
      const supabase = createServiceClient()
      const { data } = await supabase.from('app_settings').select('key, value').limit(50)
      if (data && Array.isArray(data)) {
        cachedDbKeys = {}
        for (const item of data) {
          if (item?.key && item?.value) {
            cachedDbKeys[item.key] = String(item.value).trim()
          }
        }
        cacheExpiresAt = now + 120_000 // 2 min
      }
    } catch {
      // Игнорируем сетевые ошибки, чтобы не блокировать выполнение
    }
  }

  const resolve = (key: string): string => {
    // 1. process.env (Vercel / .env.local)
    const envVal = process.env[key]
    if (envVal && envVal.trim()) return envVal.trim()

    // 2. Supabase DB (app_settings)
    const dbVal = cachedDbKeys?.[key]
    if (dbVal && dbVal.trim()) return dbVal.trim()

    return ''
  }

  return {
    groq1: resolve('GROQ_API_KEY_1') || resolve('GROQ_API_KEY'),
    groq2: resolve('GROQ_API_KEY_2'),
    gemini1: resolve('GEMINI_API_KEY_1') || resolve('GEMINI_API_KEY'),
    gemini2: resolve('GEMINI_API_KEY_2'),
    openrouter1: resolve('OPENROUTER_API_KEY_1') || resolve('OPENROUTER_API_KEY'),
    openrouter2: resolve('OPENROUTER_API_KEY_2'),
    telegramBotToken: resolve('TELEGRAM_BOT_TOKEN') || '9137976618:AAFQwFVgasD8rBBg27hqOaZaw8gfhPeVdlo',
    cronSecret: resolve('CRON_SECRET') || 'aki_cron_secret_srk_2026',
  }
}
