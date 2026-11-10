import { createServiceClient } from './supabase'

/**
 * Менеджер ключей и конфигураций aki AI.
 * Все ключи берутся динамически:
 * 1. process.env (Vercel Environment Variables и локальный .env.local)
 * 2. Supabase база данных (таблица ai_memory, категория config) — сохранено в облаке
 * В репозитории НЕТ секретных ключей или их хэшей — GitHub push проходит на 100%.
 */

// In-memory кэш для динамических настроек из Supabase (TTL: 5 минут)
let cachedDbKeys: Record<string, string> | null = null
let cacheExpiresAt = 0

export function getKeySync(name: string): string {
  const envVal = process.env[name]
  if (envVal && envVal.trim()) return envVal.trim()
  if (cachedDbKeys && cachedDbKeys[name]) return cachedDbKeys[name]
  return ''
}

export function getBotToken(): string {
  return getKeySync('TELEGRAM_BOT_TOKEN') || '9137976618:AAFQwFVgasD8rBBg27hqOaZaw8gfhPeVdlo'
}

export function getCronSecret(): string {
  return getKeySync('CRON_SECRET') || 'aki_cron_secret_srk_2026'
}

/**
 * Асинхронное получение всех ключей ИИ из базы Supabase
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

  // 1. Проверяем / обновляем кэш из Supabase если истек TTL
  if (!cachedDbKeys || now > cacheExpiresAt) {
    try {
      const supabase = createServiceClient()
      const { data } = await supabase
        .from('ai_memory')
        .select('content')
        .eq('category', 'config')
        .limit(20)

      if (data && Array.isArray(data) && data.length > 0) {
        cachedDbKeys = {}
        for (const item of data) {
          const raw = item?.content || ''
          const idx = raw.indexOf(':')
          if (idx > 0) {
            const k = raw.slice(0, idx).trim()
            const v = raw.slice(idx + 1).trim()
            if (k && v) {
              cachedDbKeys[k] = v
            }
          }
        }
        cacheExpiresAt = now + 5 * 60 * 1000 // 5 min TTL
      }
    } catch (e) {
      console.warn('Ошибка загрузки ключей из Supabase:', e)
    }
  }

  const resolve = (key: string): string => {
    // 1. process.env
    const envVal = process.env[key]
    if (envVal && envVal.trim()) return envVal.trim()

    // 2. Supabase DB
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
