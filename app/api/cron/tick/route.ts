import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getAlmatyDateTime, getLiveDatabaseContext } from '@/lib/chat'

async function sendTelegramNotification(token: string, chatId: number | string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    })
  } catch (e) {
    console.error('Ошибка отправки проактивного сообщения в Telegram:', e)
  }
}

export async function GET(req: NextRequest) {
  return handleTick(req)
}

export async function POST(req: NextRequest) {
  return handleTick(req)
}

async function handleTick(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const keyParam = req.nextUrl.searchParams.get('key')
    const validKeys = [
      process.env.CRON_SECRET,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      'aki_cron_secret_srk_2026',
    ].filter(Boolean) as string[]

    const providedKey = (authHeader ? authHeader.replace(/^Bearer\s+/i, '') : keyParam) || ''

    // Проверка ключа вызова
    const isAuthorized =
      validKeys.includes(providedKey) ||
      process.env.NODE_ENV === 'development'

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN не задан' }, { status: 500 })
    }

    const supabase = createServiceClient()

    // Находим chat_id Серика из telegram_users
    const { data: users } = await supabase
      .from('telegram_users')
      .select('chat_id, first_name')
      .order('last_interaction', { ascending: false })
      .limit(1)

    const targetUser = users?.[0]
    if (!targetUser || !targetUser.chat_id) {
      return NextResponse.json({ message: 'Нет пользователей Telegram для отправки' })
    }

    const chatId = targetUser.chat_id
    const userName = targetUser.first_name || 'Серик'

    // Время в Алматы
    const { timeStr, dayOfWeek, dateStr } = getAlmatyDateTime()
    const [hourStr, minStr] = timeStr.split(':')
    const currentHour = parseInt(hourStr, 10)

    // 1. ТИХИЕ ЧАСЫ (с 23:00 до 08:30) — не тревожим
    if (currentHour >= 23 || currentHour < 8 || (currentHour === 8 && parseInt(minStr, 10) < 30)) {
      return NextResponse.json({ skipped: true, reason: 'Тихие часы (ночь)', time: timeStr })
    }

    // 2. ПРОВЕРКА ЛИМИТОВ: когда aki писал проактивно в последний раз
    let lastSentTopic = ''
    try {
      const { data: logs } = await supabase
        .from('ai_proactive_log')
        .select('topic, sent_at')
        .order('sent_at', { ascending: false })
        .limit(1)

      if (logs && logs.length > 0) {
        const lastSentAt = new Date(logs[0].sent_at).getTime()
        const diffHours = (Date.now() - lastSentAt) / (1000 * 60 * 60)
        lastSentTopic = logs[0].topic

        // Не пишем чаще, чем раз в 4 часа
        if (diffHours < 4) {
          return NextResponse.json({
            skipped: true,
            reason: `Недавно уже отправлялось сообщение (${diffHours.toFixed(1)} ч назад)`,
            lastSentTopic,
          })
        }
      }
    } catch {}

    // 3. ПРОВЕРКА ПОВОДОВ
    // Загружаем данные базы
    const todayStr = new Date().toISOString().split('T')[0]
    const [habitsRes, habitLogsRes, goalsRes, peopleRes] = await Promise.all([
      supabase.from('habits').select('id, name, streak'),
      supabase.from('habit_logs').select('habit_id').eq('logged_date', todayStr),
      supabase.from('goals').select('id, title, progress').eq('status', 'active'),
      supabase.from('people').select('name, birthday, relation'),
    ])

    const completedHabitIds = new Set((habitLogsRes.data || []).map((l: any) => l.habit_id))
    const pendingHabits = (habitsRes.data || []).filter((h: any) => !completedHabitIds.has(h.id))

    let messageToSend = ''
    let topic = ''

    // ПОВОД 1: Дни рождения людей (друзья/семья)
    const todayMMDD = todayStr.slice(5) // 'MM-DD'
    const bdayPerson = (peopleRes.data || []).find((p: any) => p.birthday && p.birthday.endsWith(todayMMDD))
    if (bdayPerson && lastSentTopic !== `birthday_${bdayPerson.name}`) {
      topic = `birthday_${bdayPerson.name}`
      messageToSend = `🎉 <b>Серик, важное напоминание!</b>\n\nСегодня день рождения у <b>${bdayPerson.name}</b> (${bdayPerson.relation || 'друг'})!\nНе забудь тепло поздравить.`
    }

    // ПОВОД 2: Утренний фокус (с 09:00 до 11:30)
    if (!messageToSend && currentHour >= 9 && currentHour < 12 && lastSentTopic !== 'morning') {
      topic = 'morning'
      const habitsList = pendingHabits.slice(0, 3).map((h: any) => `• ${h.name}`).join('\n')
      messageToSend =
        `🌅 <b>Доброе утро, ${userName}!</b>\n\n` +
        `Сегодня ${dayOfWeek}, ${dateStr}.\n\n` +
        (habitsList
          ? `Твой фокус по привычкам на день:\n${habitsList}\n\nС чего планируешь начать?`
          : `Все основные привычки готовы или трекер ждет твоего дня. Чем займемся?`)
    }

    // ПОВОД 3: Вечерний разбор (с 20:30 до 22:30)
    if (!messageToSend && currentHour >= 20 && currentHour < 23 && lastSentTopic !== 'evening') {
      topic = 'evening'
      const doneCount = (habitLogsRes.data || []).length
      const totalHabits = (habitsRes.data || []).length

      messageToSend =
        `🌙 <b>Добрый вечер, ${userName}!</b>\n\n` +
        `День подходит к концу. За сегодня выполнено: <b>${doneCount} из ${totalHabits}</b> привычек.\n\n` +
        (pendingHabits.length > 0
          ? `Осталось отметить: ${pendingHabits.map((h: any) => h.name).join(', ')}.\n`
          : `Отличная работа по привычкам сегодня!\n`) +
        `Как в целом твои ощущения и настроение за день?`
    }

    if (!messageToSend) {
      return NextResponse.json({
        skipped: true,
        reason: 'Нет актуального повода для сообщения в текущий час',
        currentHour,
      })
    }

    // 4. Отправляем в Telegram
    await sendTelegramNotification(botToken, chatId, messageToSend)

    // 5. Записываем в лог
    try {
      await supabase.from('ai_proactive_log').insert({
        topic,
        message: messageToSend,
      })
    } catch {}

    return NextResponse.json({
      success: true,
      sentTo: chatId,
      topic,
      message: messageToSend,
      time: timeStr,
    })
  } catch (err: any) {
    console.error('Ошибка в cron/tick:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

