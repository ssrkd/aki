import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const update = await req.json()
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN не задан')
      return NextResponse.json({ ok: false, error: 'Token missing' }, { status: 500 })
    }

    const message = update.message || update.edited_message
    if (!message || !message.chat) {
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat.id
    const firstName = message.chat.first_name || 'друг'
    const username = message.chat.username || null

    const supabase = createServiceClient()

    // Сохраняем пользователя в telegram_users для последующих рассылок кодов
    try {
      await supabase.from('telegram_users').upsert(
        {
          chat_id: chatId,
          username,
          first_name: firstName,
          last_interaction: new Date().toISOString(),
        },
        { onConflict: 'chat_id' }
      )
    } catch (e) {
      console.warn('Не удалось обновить telegram_users:', e)
    }

    // Генерируем 4-значный код
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 минут

    // Сохраняем в Supabase
    const { error: dbError } = await supabase.from('otp_codes').insert({
      code,
      expires_at: expiresAt,
      used: false,
    })

    if (dbError) {
      console.error('Ошибка сохранения OTP в Supabase:', dbError)
      await sendTelegramMessage(
        botToken,
        chatId,
        '❌ Ошибка сохранения кода в базе данных. Проверьте подключение Supabase.'
      )
      return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 })
    }

    // Отправляем пользователю красивое сообщение с кодом
    const replyText =
      `👋 Привет, *${firstName}*!\n\n` +
      `🔑 Твой код для входа в *aki*:\n\n` +
      `\`${code}\`\n\n` +
      `⏱ Код действует 10 минут.\n` +
      `_Нажми на цифры выше, чтобы скопировать._`

    await sendTelegramMessage(botToken, chatId, replyText, {
      inline_keyboard: [
        [{ text: '🚀 Открыть страницу входа aki', url: 'https://aki-srk.vercel.app/login' }],
      ],
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Ошибка обработки webhook Telegram:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

async function sendTelegramMessage(
  token: string,
  chatId: number | string,
  text: string,
  replyMarkup?: any
) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  })
}
