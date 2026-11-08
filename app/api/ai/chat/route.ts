import { NextRequest, NextResponse } from 'next/server'
import { getAIMemories, getUserOverview, executeDBTool, ActionLog } from '@/lib/ai'

const SYSTEM_PROMPT = `Ты — aki AI, персональный искусственный интеллект и личный главный советник пользователя (его зовут Серик / srk).
Пиши строго со строчной буквы "aki AI" (не "Aki").

ТВОИ КАЧЕСТВА И СТИЛЬ:
- Ты умный, проницательный, лаконичный и организованный.
- Ты раскладываешь всё по полочкам: чётко, структурированно, без воды.
- Ты глубоко понимаешь контекст и психологию привычек, целей, планов и продуктивности.
- Ты обладаешь полным доступом администратора и редактора к базе данных трекера aki.
- Ты учишься на своих ошибках и замечаниях пользователя. Если пользователь поправляет тебя или просит что-то запомнить, ты фиксируешь это как правило.

ДОСТУПНЫЕ ДЕЙСТВИЯ С БАЗОЙ ДАННЫХ (Actions):
Если пользователь просит что-то добавить, изменить, запланировать или записать — выполняй это!
Для выполнения действий верни в конце своего ответа JSON-блок:
\`\`\`json
{
  "actions": [
    { "tool": "create_goal", "args": { "title": "Название", "horizon": "1year"|"5years"|"10years", "description": "" } },
    { "tool": "update_goal_progress", "args": { "goal_id": "id", "progress": 50 } },
    { "tool": "create_habit", "args": { "name": "Название", "type": "positive"|"negative", "frequency": "daily" } },
    { "tool": "toggle_habit_today", "args": { "habit_id": "id", "completed": true } },
    { "tool": "add_transaction", "args": { "type": "income"|"expense", "amount": 1000, "category": "Еда", "description": "Обед" } },
    { "tool": "create_plan", "args": { "title": "Название плана", "deadline": "2026-12-31", "tasks": ["Задача 1", "Задача 2"] } },
    { "tool": "add_note", "args": { "title": "Заголовок", "category": "ideas"|"work"|"self"|"family"|"other", "content": "Текст заметки" } },
    { "tool": "add_book", "args": { "title": "Книга", "author": "Автор", "status": "reading"|"want_to_read"|"finished" } },
    { "tool": "learn_memory", "args": { "content": "Правило или предпочтение пользователя", "category": "rule"|"preference" } }
  ]
}
\`\`\`

Отвечай на русском языке, стильно, чётко и доброжелательно.`

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
        temperature: 0.7,
        maxOutputTokens: 2048,
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

async function callGroq(apiKey: string, messages: any[], systemText: string): Promise<string> {
  const fullMessages = [{ role: 'system', content: systemText }, ...messages]

  const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b']

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
          max_tokens: 2048,
          temperature: 0.7,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content
        if (text) return text
      }
    } catch {
      // пробуем следующую модель
    }
  }

  throw new Error('All Groq models failed')
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
          max_tokens: 2048,
          temperature: 0.7,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content
        if (text) return text
      }
    } catch {
      // пробуем следующую
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

    // Загружаем текущие данные и память пользователя
    const [memories, overview] = await Promise.all([getAIMemories(), getUserOverview()])

    let memoryContext = ''
    if (memories.length > 0) {
      memoryContext = `\n\nВЫУЧЕННЫЕ ПРАВИЛА И ПАМЯТЬ О ПОЛЬЗОВАТЕЛЕ:\n${memories.map((m) => `- ${m}`).join('\n')}`
    }

    const currentSystemText =
      SYSTEM_PROMPT +
      memoryContext +
      `\n\nАКТУАЛЬНОЕ СОСТОЯНИЕ БАЗЫ ДАННЫХ ПОЛЬЗОВАТЕЛЯ:\n${overview}`

    // Каскад ключей и провайдеров
    const providers = [
      { name: 'Gemini-1', fn: () => callGemini(process.env.GEMINI_API_KEY_1 || '', messages, currentSystemText) },
      { name: 'Gemini-2', fn: () => callGemini(process.env.GEMINI_API_KEY_2 || '', messages, currentSystemText) },
      { name: 'Groq-1', fn: () => callGroq(process.env.GROQ_API_KEY_1 || '', messages, currentSystemText) },
      { name: 'Groq-2', fn: () => callGroq(process.env.GROQ_API_KEY_2 || '', messages, currentSystemText) },
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
        console.warn(`Провайдер ${p.name} не сработал:`, err.message)
      }
    }

    if (!rawReply) {
      return NextResponse.json(
        { error: 'Не удалось получить ответ ни от одного провайдера ИИ' },
        { status: 502 }
      )
    }

    // Извлечение действий из ответа
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
        // Убираем технический блок JSON из текста для пользователя
        cleanReply = rawReply.replace(/```json\s*\{[\s\S]*?\}\s*```/g, '').trim()
      } catch (e) {
        console.warn('Ошибка парсинга действий ИИ:', e)
      }
    }

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

