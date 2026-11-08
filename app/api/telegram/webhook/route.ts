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
    const text = message.text || ''

    // Генерируем 4-значный код
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 минут

    // Сохраняем в Supabase
    const supabase = createServiceClient()
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
        '❌ Ошибка при создании кода. Убедись, что таблица otp_codes создана в Supabase.'
      )
      return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 })
    }

    // Отправляем пользователю сообщение с кодом
    const replyText = `🔑 Твой одноразовый код для входа в *aki*:\n\n\`${code}\`\n\n⏱ Действует 10 минут. Нажми на код, чтобы скопировать.`

    await sendTelegramMessage(botToken, chatId, replyText)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Ошибка webhook:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

async function sendTelegramMessage(token: string, chatId: number | string, text: string) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  })
}
