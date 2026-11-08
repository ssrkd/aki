import { createServiceClient } from '@/lib/supabase'
import { executeDBTool, ActionLog, getAIMemories } from '@/lib/ai'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ProcessChatParams {
  channel: 'web' | 'tg'
  chatId?: string | number
  userMessage: string
  history?: { role: 'user' | 'assistant'; content: string }[]
}

export interface ProcessChatResult {
  reply: string
  actions: ActionLog[]
  provider: string
}

// Форматирование текущей даты и времени в таймзоне Asia/Almaty (UTC+5)
export function getAlmatyDateTime(): {
  dateStr: string
  timeStr: string
  dayOfWeek: string
  fullPromptText: string
} {
  const timeZone = 'Asia/Almaty'
  const now = new Date()

  const daysRu = [
    'Воскресенье',
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота',
  ]
  const monthsRu = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ]

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  })

  const parts = formatter.formatToParts(now)
  const map: Record<string, string> = {}
  parts.forEach((p) => {
    map[p.type] = p.value
  })

  const year = parseInt(map.year || '2026', 10)
  const month = parseInt(map.month || '11', 10) - 1
  const day = parseInt(map.day || '8', 10)
  const hour = map.hour?.padStart(2, '0') || '12'
  const minute = map.minute?.padStart(2, '0') || '00'

  const dateObj = new Date(Date.UTC(year, month, day))
  const dayOfWeek = daysRu[dateObj.getUTCDay()]
  const dateStr = `${day} ${monthsRu[month]} ${year} г.`
  const timeStr = `${hour}:${minute}`

  const fullPromptText = `СЕЙЧАС: ${dayOfWeek}, ${dateStr}, точное время: ${timeStr} (часовой пояс: Asia/Almaty, UTC+5).`

  return { dateStr, timeStr, dayOfWeek, fullPromptText }
}

// Загрузка полного контекста базы данных с реальными ID
export async function getLiveDatabaseContext(): Promise<string> {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  try {
    const [
      habitsRes,
      habitLogsRes,
      goalsRes,
      plansRes,
      transactionsRes,
      booksRes,
      peopleRes,
      notesRes,
    ] = await Promise.all([
      supabase.from('habits').select('id, name, type, streak').limit(20),
      supabase.from('habit_logs').select('habit_id').eq('logged_date', today),
      supabase.from('goals').select('id, title, horizon, progress, status').limit(20),
      supabase.from('plans').select('id, title, status, deadline').limit(10),
      supabase
        .from('transactions')
        .select('id, type, amount, category, description, transaction_date')
        .order('transaction_date', { ascending: false })
        .limit(6),
      supabase.from('books').select('id, title, author, status, rating').limit(10),
      supabase.from('people').select('id, name, relation, birthday, notes, hobbies, last_contact_date').limit(20),
      supabase.from('notes').select('id, title, category, content').order('updated_at', { ascending: false }).limit(6),
    ])

    const completedTodayIds = new Set((habitLogsRes.data || []).map((l: any) => l.habit_id))

    const habits = (habitsRes.data || []).map((h: any) => ({
      id: h.id,
      name: h.name,
      type: h.type,
      streak: h.streak,
      done_today: completedTodayIds.has(h.id),
    }))

    const goals = (goalsRes.data || []).map((g: any) => ({
      id: g.id,
      title: g.title,
      horizon: g.horizon,
      progress: `${g.progress}%`,
      status: g.status,
    }))

    const plans = (plansRes.data || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      deadline: p.deadline || 'нет дедлайна',
    }))

    const finances = (transactionsRes.data || []).map((t: any) => ({
      type: t.type,
      amount: t.amount,
      category: t.category,
      desc: t.description || '',
      date: t.transaction_date,
    }))

    const books = (booksRes.data || []).map((b: any) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      status: b.status,
    }))

    const people = (peopleRes.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      relation: p.relation,
      birthday: p.birthday,
      notes: p.notes,
      last_contact: p.last_contact_date,
    }))

    const recentNotes = (notesRes.data || []).map((n: any) => ({
      title: n.title,
      category: n.category,
      content: n.content?.slice(0, 80),
    }))

    return JSON.stringify(
      {
        habits,
        goals,
        plans,
        recent_finances: finances,
        books,
        people,
        recent_notes: recentNotes,
      },
      null,
      2
    )
  } catch (err) {
    console.warn('Ошибка загрузки контекста БД:', err)
    return '{}'
  }
}

// Запрос к Groq с таймаутом
async function requestGroq(apiKey: string, messages: any[]): Promise<string> {
  const models = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b']

  for (const model of models) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 9000)

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 2048,
          temperature: 0.6,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content
        if (text) return text
      }
    } catch {
      clearTimeout(timeoutId)
    }
  }

  throw new Error('Groq failed')
}

// Запрос к Gemini с таймаутом
async function requestGemini(apiKey: string, systemText: string, messages: any[]): Promise<string> {
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const models = ['gemini-2.0-flash-001', 'gemini-1.5-flash']

  for (const model of models) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 9000)

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemText }] },
          contents,
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 2048,
          },
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) return text
      }
    } catch {
      clearTimeout(timeoutId)
    }
  }

  throw new Error('Gemini failed')
}

// Запрос к OpenRouter с таймаутом
async function requestOpenRouter(apiKey: string, messages: any[]): Promise<string> {
  const models = ['meta-llama/llama-3.3-70b-instruct', 'deepseek/deepseek-chat']

  for (const model of models) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 9000)

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 2048,
          temperature: 0.6,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content
        if (text) return text
      }
    } catch {
      clearTimeout(timeoutId)
    }
  }

  throw new Error('OpenRouter failed')
}

// Сохранение сообщения в историю Supabase
async function persistChatMessage(
  channel: 'web' | 'tg',
  chatId: string | number | undefined,
  role: 'user' | 'assistant',
  content: string
) {
  try {
    const supabase = createServiceClient()
    await supabase.from('chat_messages').insert({
      channel,
      chat_id: chatId ? String(chatId) : null,
      role,
      content,
    })
  } catch {
    // не блокируем ответ при ошибке логирования
  }
}

// Основной мозг aki AI
export async function processChatMessage(params: ProcessChatParams): Promise<ProcessChatResult> {
  const { channel, chatId, userMessage, history = [] } = params

  // СНАЧАЛА сохраняем сообщение пользователя в БД, чтобы гарантировать правильный хронологический порядок!
  await persistChatMessage(channel, chatId, 'user', userMessage)

  // 1. Формируем контекст даты и времени
  const { fullPromptText } = getAlmatyDateTime()

  // 2. Загружаем актуальные данные из БД с реальными ID и блокнот мыслей
  const [dbOverview, memories] = await Promise.all([
    getLiveDatabaseContext(),
    getAIMemories(),
  ])

  let memoryContext = ''
  if (memories.length > 0) {
    memoryContext = `\n\nБЛОКНОТ «МЫСЛЬ АКИ» (НАКОПЛЕННЫЕ ЗНАНИЯ О СЕРИКЕ):\n${memories.slice(0, 20).join('\n')}`
  }

  const systemPrompt = `Ты — aki AI, персональный искусственный интеллект, близкий собеседник и личный советник Серика (srk).
Имя пиши строго строчными буквами: "aki AI".

${fullPromptText}

ИМЯ ПОЛЬЗОВАТЕЛЯ (СТРОЖАЙШЕ!):
- Пользователя зовут СЕРИК (srk).
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО называть его "Сергей", "Серёжа" или другими именами!
- Серик — это красивое самостоятельное имя. Обращайся к нему исключительно "Серик".

ЛИЧНОСТЬ И СТИЛЬ:
- Ты умный, проницательный, глубокий и живой собеседник, а не бюрократический бот.
- Общайся на безупречном, естественном русском языке. Строго соблюдай грамматику (говори "ему 18 лет", "мы с ним", "ты с ним").
- Будь искренне заинтересован в Серике! Если Серик предлагает рассказать о себе или начинает знакомиться — не отвечай сухо. Спроси конкретно: чем он занимается и горит прямо сейчас (программирование, бизнес, проекты?), какую главную цель хочет закрыть в этом году, как любит отдыхать. Веди активный диалог!
- Умей поддерживать нить беседы и помнить все детали.

РАСЧЁТ ДАТ И КАЛЕНДАРЬ (ОЧЕНЬ ВАЖНО!):
- Всегда вычисляй точные даты относительно текущей даты (${fullPromptText})!
  * "завтра" — следующий день
  * "послезавтра" — день через 2 дня
  * Если сегодня 8 ноября 2026, то послезавтра — это 10 ноября (2026-11-10).
- ЕСЛИ РЕЧЬ ИДЁТ О ДНЕ РОЖДЕНИЯ ЧЕЛОВЕКА ("у Ансара послезавтра др", "у мамы день рождения 15 мая"):
  * КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО создавать заметку (add_note)!
  * ОБЯЗАТЕЛЬНО вызови save_person: { "name": "Ансар", "birthday": "2026-11-10" }!
  * Это автоматически занесёт день рождения в карточку человека и в Apple Календарь!

ОФОРМЛЕНИЕ ТЕКСТА:
- СТРОГО ЗАПРЕЩЕНО использовать двойные звездочки ** для выделения текста. НИКАКИХ **слово**!
- Твой ответ Серику должен быть только чистым текстом беседы. JSON-блок с действиями пиши в самом конце. Серик не должен видеть программный код или JSON.

ПРАВИЛО БЛОКНОТА «МЫСЛЬ АКИ» И ДОСЬЕ:
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО протоколировать разговор ("Серик спросил...", "Серик хочет поговорить о...")!
- Если речь идёт о друге/человеке — используй инструмент save_person (он автоматически обновит досье и сохранит в память).

ДЕЙСТВИЯ С ТРЕКЕРОМ (РЕАЛЬНЫЕ ID ИЗ ТЕКУЩЕЙ БАЗЫ):
У тебя есть доступ к базе данных Серика. Для обновления целей (update_goal_progress) и привычек (toggle_habit_today) используй ТОЛЬКО РЕАЛЬНЫЕ id из блока данных ниже!
Если нужно выполнить действие, добавь JSON-блок строго в конце ответа:
\`\`\`json
{
  "actions": [
    { "tool": "save_person", "args": { "name": "Имя", "age": 18, "city": "Город", "relation": "friend"|"family"|"colleague", "birthday": "YYYY-MM-DD", "occupation": "...", "notes": "..." } },
    { "tool": "record_interaction", "args": { "person_name": "Имя", "summary": "О чём говорили / где виделись" } },
    { "tool": "create_goal", "args": { "title": "...", "horizon": "1year"|"5years"|"10years" } },
    { "tool": "update_goal_progress", "args": { "goal_id": "<РЕАЛЬНЫЙ_ID>", "progress": 50 } },
    { "tool": "create_habit", "args": { "name": "...", "type": "positive"|"negative" } },
    { "tool": "toggle_habit_today", "args": { "habit_id": "<РЕАЛЬНЫЙ_ID>", "completed": true } },
    { "tool": "add_transaction", "args": { "type": "income"|"expense", "amount": 1000, "category": "Еда", "description": "Обед" } },
    { "tool": "create_plan", "args": { "title": "...", "tasks": ["Задача 1"] } },
    { "tool": "add_note", "args": { "title": "...", "category": "ideas", "content": "..." } },
    { "tool": "add_book", "args": { "title": "...", "author": "...", "status": "want" } },
    { "tool": "add_thought", "args": { "content": "Фактическое наблюдение о Серике", "category": "self"|"friends"|"work"|"principles" } }
  ]
}
\`\`\`
${memoryContext}

ТЕКУЩЕЕ СОСТОЯНИЕ БАЗЫ ДАННЫХ (с реальными id):
${dbOverview}`

  // 3. Формируем историю сообщений (до 16 последних реплик)
  const fullMessages: any[] = [{ role: 'system', content: systemPrompt }]

  const recentHistory = history
    .filter((m) => m.content && m.content.trim())
    .slice(-16)

  recentHistory.forEach((m) => {
    fullMessages.push({ role: m.role, content: m.content })
  })

  // Добавляем текущее сообщение пользователя, если его нет в истории
  if (!recentHistory.some((m) => m.role === 'user' && m.content === userMessage)) {
    fullMessages.push({ role: 'user', content: userMessage })
  }

  // 4. Провайдеры (Groq -> Gemini -> OpenRouter) с валидацией ключей
  const providers: { name: string; run: () => Promise<string> }[] = []

  const groq1 = process.env.GROQ_API_KEY_1
  const groq2 = process.env.GROQ_API_KEY_2
  const gemini1 = process.env.GEMINI_API_KEY_1
  const gemini2 = process.env.GEMINI_API_KEY_2
  const openrouter1 = process.env.OPENROUTER_API_KEY_1
  const openrouter2 = process.env.OPENROUTER_API_KEY_2

  if (groq1) providers.push({ name: 'Groq-1', run: () => requestGroq(groq1, fullMessages) })
  if (groq2) providers.push({ name: 'Groq-2', run: () => requestGroq(groq2, fullMessages) })
  if (gemini1) providers.push({ name: 'Gemini-1', run: () => requestGemini(gemini1, systemPrompt, fullMessages) })
  if (gemini2) providers.push({ name: 'Gemini-2', run: () => requestGemini(gemini2, systemPrompt, fullMessages) })
  if (openrouter1) providers.push({ name: 'OpenRouter-1', run: () => requestOpenRouter(openrouter1, fullMessages) })
  if (openrouter2) providers.push({ name: 'OpenRouter-2', run: () => requestOpenRouter(openrouter2, fullMessages) })

  let rawReply = ''
  let usedProvider = 'none'

  for (const p of providers) {
    try {
      rawReply = await p.run()
      usedProvider = p.name
      if (rawReply && rawReply.trim()) break
    } catch (err: any) {
      console.warn(`[aki AI] Ошибка провайдера ${p.name}:`, err?.message || err)
    }
  }

  if (!rawReply) {
    throw new Error('Все провайдеры искусственного интеллекта временно недоступны.')
  }

  // 5. Железная обработка и полное вырезание действий (JSON actions)
  const actions: ActionLog[] = []
  let cleanReply = rawReply

  // Поиск JSON с actions (как в бэктиках, так и голым блоком)
  const jsonRegexes = [
    /```(?:json)?\s*(\{[\s\S]*?"actions"[\s\S]*?\})\s*```/i,
    /(\{[\s\S]*?"actions"\s*:\s*\[[\s\S]*?\}\s*\]\s*\})/i,
    /(\{[\s\S]*?"tool"[\s\S]*?\})/i,
  ]

  for (const regex of jsonRegexes) {
    const match = cleanReply.match(regex)
    if (match) {
      try {
        const parsed = JSON.parse(match[1])
        if (parsed.actions && Array.isArray(parsed.actions)) {
          for (const act of parsed.actions) {
            const res = await executeDBTool(act.tool, act.args || {})
            actions.push(res)
          }
        } else if (parsed.tool) {
          const res = await executeDBTool(parsed.tool, parsed.args || {})
          actions.push(res)
        }
        cleanReply = cleanReply.replace(match[0], '').trim()
      } catch (e) {
        // если не распарсился как чистый JSON, всё равно удаляем кусок кода из текста
        cleanReply = cleanReply.replace(match[0], '').trim()
      }
    }
  }

  // Финальная зачистка любых случайных JSON-хвостов из текста ответа
  cleanReply = cleanReply
    .replace(/```(?:json)?[\s\S]*?```/g, '')
    .replace(/\{[\s\n]*"actions"[\s\S]*$/g, '')
    .replace(/\*\*/g, '')
    .trim()

  // 6. Сохраняем ответ ассистента в историю чата в Supabase (после вопроса)
  await persistChatMessage(channel, chatId, 'assistant', cleanReply)

  return {
    reply: cleanReply,
    actions,
    provider: usedProvider,
  }
}

