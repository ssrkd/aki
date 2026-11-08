import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN is not defined' }, { status: 400 })
  }

  // Получаем домен приложения из запроса
  const host = req.headers.get('host')
  const protocol = req.headers.get('x-forwarded-proto') || 'https'
  const webhookUrl = `${protocol}://${host}/api/telegram/webhook`

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`)
    const data = await res.json()

    return NextResponse.json({
      message: 'Результат установки вебхука Telegram',
      webhookUrl,
      telegramResponse: data,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
