import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getBotToken } from '@/lib/keys'

export async function POST(req: NextRequest) {
  try {
    const botToken = getBotToken()
    const supabase = createServiceClient()

    // 1. Генерируем 4-значный OTP код
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 минут

    const { error: dbError } = await supabase.from('otp_codes').insert({
      code,
      expires_at: expiresAt,
      used: false,
    })

    if (dbError) {
      console.error('Ошибка сохранения кода в Supabase:', dbError)
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
    }

    // 2. Получатель кода — СТРОГО Серик (chat_id: 996317285), без дубликатов!
    const OWNER_CHAT_ID = 996317285

    // 3. Отправляем строго 1 сообщение
    if (botToken) {
      const text =
        `🔔 *Запрос на вход в aki*\n\n` +
        `Кто-то запросил код для входа на странице логина.\n\n` +
        `🔑 Твой код: \`${code}\`\n\n` +
        `⏱ Код действует 10 минут. Нажми, чтобы скопировать.`

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: OWNER_CHAT_ID,
            text,
            parse_mode: 'Markdown',
          }),
        })
      } catch (err) {
        console.error('Ошибка отправки Telegram:', err)
      }

      return NextResponse.json({
        success: true,
        sent: true,
        message: 'Код отправлен в Telegram',
        botUsername: 'srkandaki_bot',
      })
    }

    // Если токен не задан
    return NextResponse.json({
      success: true,
      sent: false,
      message: 'Бот не настроен',
      botUsername: 'srkandaki_bot',
    })
  } catch (err) {
    console.error('Ошибка в request-code:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

