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

// Отправка действия "печатает..." или "записывает аудио..."
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

  // 1. Получаем путь к файлу из Telegram
  const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`)
  const fileData = await fileRes.json()
  if (!fileData.ok || !fileData.result?.file_path) {
    throw new Error('Не удалось получить файл голосового из Telegram')
  }

  // 2. Скачиваем аудиофайл
  const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`
  const audioBlob = await (await fetch(fileUrl)).blob()

  // 3. Отправляем в Groq Whisper API
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

    // Проверка секретного токена вебхука (если настроен)
    const secretHeader = req.headers.get('x-telegram-bot-api-secret-token')
    const expectedSecret = process.env.TELEGRAM_SECRET_TOKEN
    if (expectedSecret && secretHeader !== expectedSecret) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    const update = await req.json()
    const message = update.message || update.edited_message

    if (!message || !message.chat) {
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat.id
    const firstName = message.chat.first_name || 'друг'
    const username = message.chat.username || null
    const text = message.text ? message.text.trim() : ''

    const supabase = createServiceClient()

    // Запоминаем пользователя Telegram
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

    // 1. Команда /start или /login — выдаём код авторизации
    if (text === '/start' || text === '/login' || text.toLowerCase() === 'код' || text.toLowerCase() === 'войти') {
      const code = Math.floor(1000 + Math.random() * 9000).toString()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      await supabase.from('otp_codes').insert({
        code,
        expires_at: expiresAt,
        used: false,
      })

      const replyText =
        `👋 Привет, <b>${firstName}</b>!\n\n` +
        `🔑 Твой код для входа в <b>aki</b>:\n\n` +
        `<code>${code}</code>\n\n` +
        `⏱ Код действует 10 минут.\n\n` +
        `💬 Ты также можешь общаться со мной прямо здесь! Пиши мне любые мысли, цели, привычки или наговаривай голосовые сообщения.`

      await sendTelegramMessage(botToken, chatId, replyText, {
        inline_keyboard: [
          [{ text: '🚀 Открыть веб-трекер aki', url: 'https://aki-srk.vercel.app/login' }],
        ],
      })
      return NextResponse.json({ ok: true })
    }

    // 2. Обработка голосовых сообщений
    let incomingText = text
    if (message.voice) {
      await sendChatAction(botToken, chatId, 'record_voice')
      try {
        const transcribed = await transcribeVoice(botToken, message.voice.file_id)
        if (!transcribed || !transcribed.trim()) {
          await sendTelegramMessage(
            botToken,
            chatId,
            '🎙 Не удалось разобрать слова в голосовом сообщении. Попробуй наговорить ещё раз или напиши текстом.'
          )
          return NextResponse.json({ ok: true })
        }
        incomingText = transcribed
        // Оповестим пользователя, что расшифровали
        await sendTelegramMessage(botToken, chatId, `🎙 <i>«${transcribed}»</i>`)
      } catch (voiceErr: any) {
        console.error('Ошибка транскрибации:', voiceErr)
        await sendTelegramMessage(botToken, chatId, '❌ Ошибка при обработке аудио. Попробуй текстом.')
        return NextResponse.json({ ok: true })
      }
    }

    // 3. Обработка пересланных сообщений или фото с подписью (сохранение в заметки)
    if (message.caption) {
      incomingText = message.caption
    } else if (message.forward_date && !incomingText) {
      incomingText = 'Пересланное сообщение: ' + (message.text || 'заметка')
    }

    if (!incomingText) {
      return NextResponse.json({ ok: true })
    }

    // Показываем индикатор печати
    await sendChatAction(botToken, chatId, 'typing')

    // Загружаем последнюю историю из chat_messages (если есть)
    let history: { role: 'user' | 'assistant'; content: string }[] = []
    try {
      const { data: historyData } = await supabase
        .from('chat_messages')
        .select('role, content')
        .or(`chat_id.eq.${chatId},channel.eq.web`)
        .order('created_at', { ascending: false })
        .limit(10)

      if (historyData && historyData.length > 0) {
        history = historyData.reverse().map((h: any) => ({
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

    // Формируем красивый ответ
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
