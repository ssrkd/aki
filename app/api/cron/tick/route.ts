import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getAlmatyDateTime } from '@/lib/chat'

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

    // Получатель — СТРОГО Серик (chat_id: 996317285)
    const chatId = 996317285
    const userName = 'Серик'

    // Время в Алматы
    const { timeStr, dayOfWeek, dateStr } = getAlmatyDateTime()
    const [hourStr, minStr] = timeStr.split(':')
    const currentHour = parseInt(hourStr, 10)
    const todayStr = new Date().toISOString().split('T')[0]

    // ==========================================
    // 0. ПРОВЕРКА И ДОСТАВКА ПИСЕМ В БУДУЩЕЕ
    // ==========================================
    try {
      const { data: pendingLetters } = await supabase
        .from('future_letters')
        .select('id, delivery_date, content, theme, created_at')
        .lte('delivery_date', todayStr)
        .eq('delivered', false)

      if (pendingLetters && pendingLetters.length > 0) {
        for (const letter of pendingLetters) {
          const sentDateStr = letter.created_at ? new Date(letter.created_at).toLocaleDateString('ru-RU') : 'прошлом'
          const letterText =
            `✉️ <b>Письмо из прошлого: «${letter.theme || 'послание себе'}»</b>\n\n` +
            `<i>Серик, ты написал это письмо ${sentDateStr} с доставкой на сегодня:</i>\n\n` +
            `«${letter.content}»\n\n` +
            `Как изменились твои мысли с того момента?`

          await sendTelegramNotification(botToken, chatId, letterText)
          await supabase.from('future_letters').update({ delivered: true }).eq('id', letter.id)
        }
      }
    } catch (e) {
      console.warn('Ошибка проверки future_letters:', e)
    }

    // ==========================================
    // 1. ТИХИЕ ЧАСЫ (с 23:00 до 08:30) — не тревожим
    // ==========================================
    if (currentHour >= 23 || currentHour < 8 || (currentHour === 8 && parseInt(minStr, 10) < 30)) {
      return NextResponse.json({ skipped: true, reason: 'Тихие часы (ночь)', time: timeStr })
    }

    // ==========================================
    // 2. ПРОВЕРКА ЛИМИТОВ: когда aki писал в последний раз
    // ==========================================
    let lastSentTopic = ''
    let lastInterviewHoursAgo = 999
    try {
      const { data: logs } = await supabase
        .from('ai_proactive_log')
        .select('topic, sent_at')
        .order('sent_at', { ascending: false })
        .limit(10)

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

        const lastInterviewLog = logs.find((l: any) => l.topic && l.topic.startsWith('interview_'))
        if (lastInterviewLog) {
          lastInterviewHoursAgo = (Date.now() - new Date(lastInterviewLog.sent_at).getTime()) / (1000 * 60 * 60)
        }
      }
    } catch {}

    // ==========================================
    // 3. ПРОВЕРКА ПОВОДОВ
    // ==========================================
    const [habitsRes, habitLogsRes, peopleRes, memoriesRes] = await Promise.all([
      supabase.from('habits').select('id, name, streak'),
      supabase.from('habit_logs').select('habit_id').eq('logged_date', todayStr),
      supabase.from('people').select('name, birthday, relation'),
      supabase.from('ai_memory').select('category, content'),
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

    // ПОВОД 2: Утренний фокус (с 09:00 до 12:00)
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

    // ПОВОД 3: ИНТЕРВЬЮ-РЕЖИМ (раз в 2 дня, в дневное время 14:00 - 18:30)
    if (!messageToSend && currentHour >= 14 && currentHour < 19 && lastInterviewHoursAgo >= 40) {
      const allMemoriesText = (memoriesRes.data || []).map((m: any) => m.content.toLowerCase()).join(' ')

      const interviewPool: { key: string; question: string }[] = [
        {
          key: 'childhood',
          question: `Серик, размышлял тут о нас: я ведь почти ничего не знаю про твоё детство. Каким ты был маленьким? Какое самое яркое или тёплое воспоминание осталось из школы или двора?`,
        },
        {
          key: 'family',
          question: `Серик, хочу лучше понимать тебя и твои корни: расскажи немного о своей семье. Кто из близких оказал на твой характер самое сильное влияние?`,
        },
        {
          key: 'fears',
          question: `Серик, глубокий вопрос на подумать: чего ты больше всего опасаешься или боишься не успеть в жизни? О чём больше всего переживаешь?`,
        },
        {
          key: 'vision5y',
          question: `Серик, если заглянуть вперед на 5 лет, когда все твои амбиции реализовались на 100% — как выглядит твой идеальный обычный рабочий день? Чем ты занят?`,
        },
        {
          key: 'recharge',
          question: `Серик, а что для тебя служит лучшей перезагрузкой, когда накапливается усталость от задач и проектов? Что возвращает тебе чистый фокус?`,
        },
        {
          key: 'principles_deep',
          question: `Серик, какое качество в людях ты ценишь превыше всего, а за какую вещь готов вычеркнуть человека из своей жизни навсегда?`,
        },
      ]

      // Ищем тему, о которой меньше всего знаем
      const chosen =
        interviewPool.find((item) => !allMemoriesText.includes(item.key.replace('_deep', ''))) ||
        interviewPool[Math.floor(Math.random() * interviewPool.length)]

      if (chosen && lastSentTopic !== `interview_${chosen.key}`) {
        topic = `interview_${chosen.key}`
        messageToSend = `💭 <b>Вопрос от aki:</b>\n\n${chosen.question}`
      }
    }

    // ПОВОД 4: Вечерний разбор (с 20:30 до 22:30)
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
