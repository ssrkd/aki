import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
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

    // 2. Ищем chat_id получателей
    const chatIds: (string | number)[] = []

    if (process.env.TELEGRAM_CHAT_ID) {
      chatIds.push(process.env.TELEGRAM_CHAT_ID)
    }

    try {
      const { data: users } = await supabase
        .from('telegram_users')
        .select('chat_id')
        .order('last_interaction', { ascending: false })
        .limit(10)

      if (users && users.length > 0) {
        for (const u of users) {
          if (!chatIds.includes(u.chat_id)) {
            chatIds.push(u.chat_id)
          }
        }
      }
    } catch (e) {
      console.warn('telegram_users не найден или ошибка запроса:', e)
    }

    // 3. Если есть кому отправить и есть токен
    if (botToken && chatIds.length > 0) {
      const text =
        `🔔 *Запрос на вход в aki*\n\n` +
        `Кто-то запросил код для входа на странице логина.\n\n` +
        `🔑 Твой код: \`${code}\`\n\n` +
        `⏱ Код действует 10 минут. Нажми, чтобы скопировать.`

      for (const chatId of chatIds) {
        try {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🚀 Открыть страницу входа', url: 'https://aki-srk.vercel.app/login' }],
                ],
              },
            }),
          })
        } catch (err) {
          console.error(`Ошибка отправки Telegram chatId=${chatId}:`, err)
        }
      }

      return NextResponse.json({
        success: true,
        sent: true,
        message: 'Код отправлен в Telegram',
        botUsername: 'srkandaki_bot',
      })
    }

    // Если подписчиков в базе пока нет
    return NextResponse.json({
      success: true,
      sent: false,
      message: 'Напишите боту в Telegram, чтобы получить код',
      botUsername: 'srkandaki_bot',
    })
  } catch (err) {
    console.error('Ошибка в request-code:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
