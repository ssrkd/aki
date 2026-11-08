import { NextRequest, NextResponse } from 'next/server'
import { processChatMessage } from '@/lib/chat'

export async function POST(req: NextRequest) {
  try {
    // 1. Проверка авторизации: сессионная кука или Bearer токен
    const sessionCookie = req.cookies.get('aki_session')?.value
    const authHeader = req.headers.get('authorization')
    const secretToken = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY

    const isAuthorized =
      Boolean(sessionCookie) ||
      (authHeader && secretToken && authHeader === `Bearer ${secretToken}`)

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Доступ запрещен. Авторизуйтесь.' }, { status: 401 })
    }

    const body = await req.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    // Извлекаем последнее сообщение пользователя
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || ''

    const result = await processChatMessage({
      channel: 'web',
      userMessage: lastUserMsg,
      history: messages.slice(0, -1),
    })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Ошибка в /api/ai/chat:', err)
    return NextResponse.json(
      { error: err?.message || 'Внутренняя ошибка сервера aki AI' },
      { status: 500 }
    )
  }
}
