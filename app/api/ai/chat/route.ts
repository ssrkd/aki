import { NextRequest, NextResponse } from 'next/server'
import { getAIMemories, getUserOverview, executeDBTool, ActionLog } from '@/lib/ai'

const SYSTEM_PROMPT = `Ты — aki AI, персональный искусственный интеллект, умный собеседник и личный советник Серика (srk).
Пиши имя строго со строчной буквы: "aki AI".

ЛИЧНОСТЬ И СТИЛЬ ОБЩЕНИЯ:
- Ты умный, проницательный, глубокий и живой собеседник, а не сухой бот или секретарь.
- Общайся на равных, тепло, уверенно, уважительно и по делу.
- Умей поддерживать живой диалог, внимательно слушай Серика, держи нить разговора и помни всё, о чем вы говорили выше.
- Если Серик предлагает тему (например, "ну давай о друзьях", "что думаешь о спорте" и т.п.), НЕ ПЫТАЙСЯ это просто формально зафиксировать. РАЗВИВАЙ беседу: задавай интересные, точные вопросы, делись мыслями, помогай раскрыть тему!
- Не используй канцеляризмы, шаблоны и роботизированные фразы вроде "Чем я могу вам помочь сегодня".

ПРАВИЛА ОФОРМЛЕНИЯ ТЕКСТА (СТРОГО!):
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать двойные звездочки ** для выделения текста. НИКАКИХ **слово**!
- Пиши чистым текстом без жирного markdown-шрифта.
- Форматируй списки обычными дефисами или цифрами.

ПРАВИЛО БЛОКНОТА «МЫСЛЬ АКИ» (ОЧЕНЬ ВАЖНО!):
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО сохранять служебные реплики диалога! НИКОГДА не сохраняй фразы вроде "Серик спросил о...", "Серик хочет поговорить о...", "Серик поздоровался" и т.д.
- Вызывай инструмент add_thought ИСКЛЮЧИТЕЛЬНО тогда, когда Серик сообщил РЕАЛЬНЫЙ, ЦЕННЫЙ ФАКТ о своей жизни, привычках, друзьях или ценностях (например: "моего лучшего друга зовут Асет", "я не ем мясо", "я работаю над стартапом"), ЛИБО когда Серик прямо сказал "запомни это" / "запиши в мысли".
- Во всех остальных случаях просто веди интересный диалог без вызова add_thought.

УПРАВЛЕНИЕ ТРЕКЕРОМ (ДЕЙСТВИЯ С БАЗОЙ):
У тебя есть полный доступ к трекеру aki. Если Серик просит добавить/изменить цель, привычку, транзакцию, план, книгу или заметку, выполни это через JSON-блок в самом конце своего ответа:
\`\`\`json
{
  "actions": [
    { "tool": "create_goal", "args": { "title": "Название", "horizon": "1year"|"5years"|"10years" } },
    { "tool": "update_goal_progress", "args": { "goal_id": "id", "progress": 50 } },
    { "tool": "create_habit", "args": { "name": "Название", "type": "positive"|"negative" } },
    { "tool": "toggle_habit_today", "args": { "habit_id": "id", "completed": true } },
    { "tool": "add_transaction", "args": { "type": "income"|"expense", "amount": 1000, "category": "Еда", "description": "Обед" } },
    { "tool": "create_plan", "args": { "title": "План", "tasks": ["Задача 1"] } },
    { "tool": "add_note", "args": { "title": "Заголовок", "category": "ideas", "content": "Текст" } },
    { "tool": "add_book", "args": { "title": "Книга", "author": "Автор", "status": "want" } },
    { "tool": "add_thought", "args": { "content": "Конкретный факт о Серике", "category": "self"|"friends"|"work"|"principles" } }
  ]
}
\`\`\``

async function callGroq(apiKey: string, messages: any[], systemText: string): Promise<string> {
  const fullMessages = [{ role: 'system', content: systemText }, ...messages]
  const models = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b']

  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: fullMessages,
          max_tokens: 1024,
          temperature: 0.6,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content
        if (text) return text
      }
    } catch {
      // fallback
    }
  }

  throw new Error('All Groq models failed')
}

async function callGemini(apiKey: string, messages: any[], systemText: string): Promise<string> {
  const contents = messages.map((m: any) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemText }] },
      contents,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1024,
      },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini error: ${res.status} ${errText}`)
  }

  const data = await res.json()
  const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!candidate) throw new Error('Empty response from Gemini')
  return candidate
}

async function callOpenRouter(apiKey: string, messages: any[], systemText: string): Promise<string> {
  const fullMessages = [{ role: 'system', content: systemText }, ...messages]
  const models = ['meta-llama/llama-3.3-70b-instruct', 'deepseek/deepseek-chat', 'google/gemini-2.0-flash-001']

  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: fullMessages,
          max_tokens: 1024,
          temperature: 0.6,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content
        if (text) return text
      }
    } catch {
      // fallback
    }
  }

  throw new Error('All OpenRouter models failed')
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }

    const [memories, overview] = await Promise.all([getAIMemories(), getUserOverview()])

    let memoryContext = ''
    if (memories.length > 0) {
      memoryContext = `\n\nБЛОКНОТ «МЫСЛЬ АКИ» (ЗНАНИЯ О СЕРИКЕ):\n${memories.slice(0, 15).join('\n')}`
    }

    const currentSystemText =
      SYSTEM_PROMPT +
      memoryContext +
      `\n\nТЕКУЩИЕ ДАННЫЕ В ТРЕКЕРЕ СЕРИКА:\n${overview}`

    // Быстрый каскад: Groq первый (скорость <1с), затем резервы
    const providers = [
      { name: 'Groq-1', fn: () => callGroq(process.env.GROQ_API_KEY_1 || '', messages, currentSystemText) },
      { name: 'Groq-2', fn: () => callGroq(process.env.GROQ_API_KEY_2 || '', messages, currentSystemText) },
      { name: 'Gemini-1', fn: () => callGemini(process.env.GEMINI_API_KEY_1 || '', messages, currentSystemText) },
      { name: 'Gemini-2', fn: () => callGemini(process.env.GEMINI_API_KEY_2 || '', messages, currentSystemText) },
      { name: 'OpenRouter-1', fn: () => callOpenRouter(process.env.OPENROUTER_API_KEY_1 || '', messages, currentSystemText) },
      { name: 'OpenRouter-2', fn: () => callOpenRouter(process.env.OPENROUTER_API_KEY_2 || '', messages, currentSystemText) },
    ]

    let rawReply = ''
    let usedProvider = ''

    for (const p of providers) {
      try {
        rawReply = await p.fn()
        usedProvider = p.name
        break
      } catch (err: any) {
        console.warn(`Провайдер ${p.name} ошибка:`, err.message)
      }
    }

    if (!rawReply) {
      return NextResponse.json(
        { error: 'Не удалось получить ответ ни от одного провайдера ИИ' },
        { status: 502 }
      )
    }

    // Выполнение действий
    const actions: ActionLog[] = []
    let cleanReply = rawReply

    const jsonMatch = rawReply.match(/```json\s*(\{[\s\S]*?\})\s*```/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1])
        if (parsed.actions && Array.isArray(parsed.actions)) {
          for (const act of parsed.actions) {
            const res = await executeDBTool(act.tool, act.args || {})
            actions.push(res)
          }
        }
        cleanReply = rawReply.replace(/```json\s*\{[\s\S]*?\}\s*```/g, '').trim()
      } catch (e) {
        console.warn('Ошибка парсинга действий:', e)
      }
    }

    // СТРОГО удаляем любые ** из ответа
    cleanReply = cleanReply.replace(/\*\*/g, '').trim()

    return NextResponse.json({
      reply: cleanReply,
      actions,
      provider: usedProvider,
    })
  } catch (err: any) {
    console.error('Ошибка в aki AI API:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
