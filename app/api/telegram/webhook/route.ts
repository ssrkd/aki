import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { processChatMessage } from '@/lib/chat'

// Отправка текстового сообщения в Telegram
async function sendTelegramMessage(
  token: string,
  chatId: number | string,
  text: string,
  replyMarkup?: any
) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    })
  } catch (err) {
    console.error('Ошибка отправки сообщения в Telegram:', err)
  }
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

export async function POST(req: NextRequest) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ ok: false, error: 'Token missing' }, { status: 500 })
    }

    const update = await req.json()
    const message = update.message || update.edited_message

    if (!message || !message.chat) {
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat.id
    const firstName = message.chat.first_name || 'Серик'
    const username = message.chat.username || null
    const text = message.text ? message.text.trim() : ''

    const supabase = createServiceClient()

    // 1. Команда /myid или /id — чтобы Серик мог быстро узнать свой Telegram Chat ID
    if (text === '/myid' || text === '/id') {
      await sendTelegramMessage(
        botToken,
        chatId,
        `🆔 <b>Твой Telegram ID:</b> <code>${chatId}</code>\n\nМожешь скопировать его в настройки или отправить мне.`
      )
      return NextResponse.json({ ok: true })
    }

    // 2. Определение владельца (Серика)
    // Проверяем: либо совпадает с переменной TELEGRAM_OWNER_ID, либо это первый/единственный зарегистрированный пользователь
    const configuredOwnerId = process.env.TELEGRAM_OWNER_ID || process.env.TELEGRAM_CHAT_ID

    let isOwner = false
    if (configuredOwnerId) {
      isOwner = String(chatId) === String(configuredOwnerId)
    } else {
      // Если переменная не задана, проверяем первого пользователя в telegram_users
      const { data: owners } = await supabase
        .from('telegram_users')
        .select('chat_id')
        .order('created_at', { ascending: true })
        .limit(1)

      if (owners && owners.length > 0) {
        isOwner = String(chatId) === String(owners[0].chat_id)
      } else {
        // Если база пустая — первый написавший автоматически становится владельцем!
        isOwner = true
      }
    }

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

    // 3. ЕСЛИ ЭТО НЕ СЕРИК — вежливо отказываем
    if (!isOwner) {
      await sendTelegramMessage(
        botToken,
        chatId,
        'Здравствуйте! Я — персональный ассистент Серика. Доступ к системе и общению открыт только для владельца. Желаю вам хорошего дня!'
      )
      return NextResponse.json({ ok: true })
    }

    // 4. ЕСЛИ ЭТО СЕРИК:
    // Команда /start — просто приветствие БЕЗ ВЫДАЧИ ПАРОЛЕЙ!
    if (text === '/start') {
      await sendTelegramMessage(
        botToken,
        chatId,
        `Привет, <b>${firstName}</b>! Я aki AI — твой личный ассистент.\n\n` +
        `Я на связи 24/7. Можешь писать мне любые мысли, задачи, планы или наговаривать голосовые сообщения. Чем займёмся?`
      )
      return NextResponse.json({ ok: true })
    }

    // 5. Обработка голосовых сообщений
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

    await sendTelegramMessage(botToken, chatId, finalTgText)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Ошибка обработки webhook Telegram:', err)
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 })
  }
}
