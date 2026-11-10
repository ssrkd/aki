import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { processChatMessage } from '@/lib/chat'

export const maxDuration = 60

// Отправка текстового сообщения в Telegram (с защитой от сбоев HTML-парсинга)
async function sendTelegramMessage(
  token: string,
  chatId: number | string,
  text: string,
  replyMarkup?: any
) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.warn('Telegram HTML send failed, retrying plain text:', errText)
      // Если Telegram отклонил из-за невалидного HTML (например <РЕАЛЬНЫЙ_ID>), отправляем чистый текст
      const cleanText = text.replace(/<[^>]*>/g, '')
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: cleanText,
          reply_markup: replyMarkup,
        }),
      })
    }
  } catch (err) {
    console.error('Ошибка отправки сообщения в Telegram:', err)
  }
}

// Ответ на нажатие inline-кнопки
async function answerCallbackQuery(token: string, callbackQueryId: string, text?: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: false,
      }),
    })
  } catch {}
}

// Отправка действия "печатает..."
async function sendChatAction(token: string, chatId: number | string, action = 'typing') {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action }),
    })
  } catch {}
}

// Транскрибация голосового сообщения через Groq Whisper
async function transcribeVoice(botToken: string, fileId: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY_2
  if (!groqKey) {
    throw new Error('Groq API ключ не настроен для Whisper')
  }

  const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`)
  const fileData = await fileRes.json()
  if (!fileData.ok || !fileData.result?.file_path) {
    throw new Error('Не удалось получить файл голосового из Telegram')
  }

  const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`
  const audioBlob = await (await fetch(fileUrl)).blob()

  const formData = new FormData()
  formData.append('file', audioBlob, 'voice.ogg')
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('language', 'ru')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqKey}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Ошибка Whisper: ${errText}`)
  }

  const transcript = await res.json()
  return transcript.text || ''
}

const MODE_MAP: Record<string, { mode: string; title: string; desc: string }> = {
  '/друг': { mode: 'friend', title: '🤝 Близкий друг', desc: 'Теплота, поддержка, разговор на равных и добрый юмор.' },
  '/коуч': { mode: 'coach', title: '🎯 Коуч', desc: 'Сократический диалог, сильные открытые вопросы, фокус на действиях.' },
  '/наставник': { mode: 'mentor', title: '⚡ Строгий наставник', desc: 'Дисциплина, честность, никаких отговорок и поблажек.' },
  '/спорщик': { mode: 'devil', title: '⚖️ Адвокат дьявола', desc: 'Интеллектуальный критик, поиск слабых мест и проверка решений.' },
  '/адвокат': { mode: 'devil', title: '⚖️ Адвокат дьявола', desc: 'Интеллектуальный критик, поиск слабых мест и проверка решений.' },
  '/слушатель': { mode: 'listener', title: '🎧 Тихий слушатель', desc: 'Полная эмпатия, выслушать без советов и оценок.' },
}

export async function POST(req: NextRequest) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ ok: false, error: 'Token missing' }, { status: 500 })
    }

    const update = await req.json()
    const supabase = createServiceClient()
    const OWNER_ID = 996317285

    // 1. ОБРАБОТКА CALLBACK QUERY (КНОПКИ 👍/👎 И ВЫБОР РЕЖИМА)
    if (update.callback_query) {
      const cq = update.callback_query
      const cqChatId = cq.message?.chat?.id
      const cqFromId = cq.from?.id
      const isCqOwner = Number(cqFromId) === OWNER_ID || Number(cqChatId) === OWNER_ID

      if (!isCqOwner) {
        await answerCallbackQuery(botToken, cq.id, 'Доступ ограничен')
        return NextResponse.json({ ok: true })
      }

      const data = cq.data || ''

      if (data === 'fb_like') {
        await answerCallbackQuery(botToken, cq.id, '👍 Принято! Рад, что ответ попал в цель.')
        try {
          await supabase.from('ai_feedback').insert({
            channel: 'tg',
            rating: 'like',
            message_content: cq.message?.text || '',
          })
        } catch {}
        return NextResponse.json({ ok: true })
      }

      if (data === 'fb_dislike') {
        await answerCallbackQuery(botToken, cq.id, '👎 Зафиксировал! Добавил в лог доработки.')
        try {
          await supabase.from('ai_feedback').insert({
            channel: 'tg',
            rating: 'dislike',
            message_content: cq.message?.text || '',
          })
        } catch {}
        await sendTelegramMessage(
          botToken,
          cqChatId,
          'Понял тебя. Напиши парой слов, что именно было не так или как лучше формулировать ответы — я сразу внесу это в свои заметки о тебе!'
        )
        return NextResponse.json({ ok: true })
      }

      if (data === 'show_modes') {
        await answerCallbackQuery(botToken, cq.id)
        await sendTelegramMessage(
          botToken,
          cqChatId,
          '<b>Выбери режим общения:</b>',
          {
            inline_keyboard: [
              [
                { text: '🤝 Близкий друг', callback_data: 'set_mode_friend' },
                { text: '🎯 Коуч', callback_data: 'set_mode_coach' },
              ],
              [
                { text: '⚡ Строгий наставник', callback_data: 'set_mode_mentor' },
                { text: '⚖️ Адвокат дьявола', callback_data: 'set_mode_devil' },
              ],
              [
                { text: '🎧 Тихий слушатель', callback_data: 'set_mode_listener' },
              ],
            ],
          }
        )
        return NextResponse.json({ ok: true })
      }

      if (data.startsWith('set_mode_')) {
        const targetMode = data.replace('set_mode_', '')
        const modeInfo = Object.values(MODE_MAP).find((m) => m.mode === targetMode)
        try {
          await supabase.from('user_settings').upsert(
            { id: '00000000-0000-0000-0000-000000000001', chat_mode: targetMode },
            { onConflict: 'id' }
          )
        } catch {}
        await answerCallbackQuery(botToken, cq.id, `Режим: ${modeInfo?.title || targetMode}`)
        await sendTelegramMessage(
          botToken,
          cqChatId,
          `Режим общения переключен на: <b>${modeInfo?.title || targetMode}</b>\n\n${modeInfo?.desc || ''}`
        )
        return NextResponse.json({ ok: true })
      }

      await answerCallbackQuery(botToken, cq.id)
      return NextResponse.json({ ok: true })
    }

    // 2. ОБЫЧНОЕ СООБЩЕНИЕ
    const message = update.message || update.edited_message
    if (!message || !message.chat) {
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat.id
    const firstName = message.chat.first_name || 'Серик'
    const username = message.chat.username || null
    const text = message.text ? message.text.trim() : ''

    // ВЛАДЕЛЕЦ БОТА — СТРОГО СЕРИК (ID: 996317285)
    const isOwner = Number(chatId) === OWNER_ID || String(chatId) === '996317285'

    // Сохраняем пользователя в telegram_users
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
    } catch {}

    // ЕСЛИ ЭТО НЕ СЕРИК — вежливо отказываем и блокируем доступ
    if (!isOwner) {
      await sendTelegramMessage(
        botToken,
        chatId,
        'Здравствуйте! Я — персональный личный ассистент Серика. Доступ к системе открыт исключительно для владельца. Всего доброго!'
      )
      return NextResponse.json({ ok: true })
    }

    // 3. БЫСТРЫЙ ЗАХВАТ: ФОТО
    if (message.photo && message.photo.length > 0) {
      const photo = message.photo[message.photo.length - 1]
      const caption = message.caption || 'Фото из Telegram'
      try {
        await supabase.from('notes').insert({
          title: caption.slice(0, 50),
          category: 'media',
          content: `[Фото из Telegram, file_id: ${photo.file_id}]\n${caption}`,
        })
        await sendTelegramMessage(botToken, chatId, `📸 Фото сохранено в блокнот (Медиа): «${caption}»`)
      } catch {}
      return NextResponse.json({ ok: true })
    }

    // 4. ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ ЧЕРЕЗ КОМАНДЫ (/друг, /коуч, /наставник, /спорщик, /адвокат, /слушатель, /режим)
    const lowerText = text.toLowerCase()
    if (MODE_MAP[lowerText]) {
      const modeData = MODE_MAP[lowerText]
      try {
        await supabase.from('user_settings').upsert(
          { id: '00000000-0000-0000-0000-000000000001', chat_mode: modeData.mode },
          { onConflict: 'id' }
        )
      } catch {}
      await sendTelegramMessage(
        botToken,
        chatId,
        `Режим общения изменен: <b>${modeData.title}</b>\n\n${modeData.desc}`
      )
      return NextResponse.json({ ok: true })
    }

    if (lowerText === '/режим' || lowerText === '/режимы') {
      let currentMode = 'friend'
      try {
        const { data: s } = await supabase.from('user_settings').select('chat_mode').single()
        if (s?.chat_mode) currentMode = s.chat_mode
      } catch {}

      const modesDesc = [
        `• <b>/друг</b> — 🤝 Близкий друг ${currentMode === 'friend' ? '<i>(текущий)</i>' : ''}`,
        `• <b>/коуч</b> — 🎯 Коуч ${currentMode === 'coach' ? '<i>(текущий)</i>' : ''}`,
        `• <b>/наставник</b> — ⚡ Строгий наставник ${currentMode === 'mentor' ? '<i>(текущий)</i>' : ''}`,
        `• <b>/спорщик</b> — ⚖️ Адвокат дьявола ${currentMode === 'devil' ? '<i>(текущий)</i>' : ''}`,
        `• <b>/слушатель</b> — 🎧 Тихий слушатель ${currentMode === 'listener' ? '<i>(текущий)</i>' : ''}`,
      ].join('\n')

      await sendTelegramMessage(
        botToken,
        chatId,
        `<b>Режимы общения aki AI:</b>\n\n${modesDesc}\n\nНапиши команду режима или нажми кнопку ниже:`,
        {
          inline_keyboard: [
            [
              { text: '🤝 Друг', callback_data: 'set_mode_friend' },
              { text: '🎯 Коуч', callback_data: 'set_mode_coach' },
            ],
            [
              { text: '⚡ Наставник', callback_data: 'set_mode_mentor' },
              { text: '⚖️ Адвокат дьявола', callback_data: 'set_mode_devil' },
            ],
            [
              { text: '🎧 Слушатель', callback_data: 'set_mode_listener' },
            ],
          ],
        }
      )
      return NextResponse.json({ ok: true })
    }

    // 5. БЫСТРЫЙ ЗАХВАТ: ССЫЛКИ / ЗАКЛАДКИ
    if (/^https?:\/\/\S+$/i.test(text)) {
      try {
        await supabase.from('notes').insert({
          title: 'Закладка: ' + text.slice(0, 40),
          category: 'bookmarks',
          content: text,
        })
        await sendTelegramMessage(botToken, chatId, `🔗 Ссылка сохранена в твои закладки:\n${text}`)
      } catch {}
      return NextResponse.json({ ok: true })
    }

    // 6. Команда /start (приветствие без паролей)
    if (text === '/start') {
      await sendTelegramMessage(
        botToken,
        chatId,
        `Привет, <b>${firstName}</b>! Я aki AI — твой личный ассистент и советник.\n\n` +
        `Я на связи 24/7. Можешь писать мне любые мысли, задачи, планы или наговаривать голосовые сообщения. Никаких лишних настроек — просто пиши, чем займёмся!`
      )
      return NextResponse.json({ ok: true })
    }

    // 7. Обработка голосовых сообщений
    let incomingText = text
    if (message.voice) {
      await sendChatAction(botToken, chatId, 'record_voice')
      try {
        const transcribed = await transcribeVoice(botToken, message.voice.file_id)
        if (!transcribed || !transcribed.trim()) {
          await sendTelegramMessage(
            botToken,
            chatId,
            '🎙 Не удалось разобрать слова в аудио. Попробуй наговорить ещё раз или напиши текстом.'
          )
          return NextResponse.json({ ok: true })
        }
        incomingText = transcribed
        await sendTelegramMessage(botToken, chatId, `🎙 <i>«${transcribed}»</i>`)
      } catch (voiceErr: any) {
        console.error('Ошибка транскрибации:', voiceErr)
        await sendTelegramMessage(botToken, chatId, '❌ Ошибка при обработке аудио. Попробуй текстом.')
        return NextResponse.json({ ok: true })
      }
    }

    if (message.caption) {
      incomingText = message.caption
    } else if (message.forward_date && !incomingText) {
      incomingText = 'Пересланное сообщение: ' + (message.text || 'заметка')
    }

    if (!incomingText) {
      return NextResponse.json({ ok: true })
    }

    // Индикатор печати
    await sendChatAction(botToken, chatId, 'typing')

    // Загружаем последнюю историю из chat_messages
    let history: { role: 'user' | 'assistant'; content: string }[] = []
    try {
      const { data: historyData } = await supabase
        .from('chat_messages')
        .select('role, content')
        .order('created_at', { ascending: true })
        .limit(10)

      if (historyData && historyData.length > 0) {
        history = historyData.map((h: any) => ({
          role: h.role as 'user' | 'assistant',
          content: h.content,
        }))
      }
    } catch {}

    // Вызываем единый мозг aki AI
    const result = await processChatMessage({
      channel: 'tg',
      chatId,
      userMessage: incomingText,
      history,
    })

    let finalTgText = result.reply

    // Если выполнены действия с базой, добавляем аккуратный блок внизу
    if (result.actions && result.actions.length > 0) {
      const actionBullets = result.actions
        .map((a) => `• ${a.details}`)
        .join('\n')
      finalTgText += `\n\n<b>Выполнено:</b>\n${actionBullets}`
    }

    // Кнопки оценки 👍/👎 под каждым ответом
    const feedbackMarkup = {
      inline_keyboard: [
        [
          { text: '👍', callback_data: 'fb_like' },
          { text: '👎', callback_data: 'fb_dislike' },
          { text: '🎭 Режим', callback_data: 'show_modes' },
        ],
      ],
    }

    await sendTelegramMessage(botToken, chatId, finalTgText, feedbackMarkup)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Ошибка обработки webhook Telegram:', err)
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      if (botToken) {
        await sendTelegramMessage(
          botToken,
          996317285,
          `⚠️ Не удалось ответить: ${err?.message || 'ошибка сервера'}.\nПопробуй написать ещё раз.`
        )
      }
    } catch {}
    return NextResponse.json({ ok: true }) // возвращаем ok: true, чтобы Telegram не долбил повторами
  }
}
