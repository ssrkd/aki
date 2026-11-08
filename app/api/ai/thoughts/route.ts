import { NextRequest, NextResponse } from 'next/server'
import { getAIThoughts, addAIThought, deleteAIThought, getUserOverview } from '@/lib/ai'

export async function GET() {
  try {
    const thoughts = await getAIThoughts()
    return NextResponse.json({ thoughts })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, category = 'self', content } = body

    // Авто-генерация одной точной мысли на основе трекера (экономно, без прожигания токенов)
    if (action === 'reflect') {
      const overview = await getUserOverview()
      const groqKey = process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY_2

      if (!groqKey) {
        return NextResponse.json({ error: 'No API key' }, { status: 500 })
      }

      const prompt = `Ты aki AI. На основе кратких данных пользователя Серика: ${overview}.
Сделай ОДНО короткое, глубокое наблюдение (максимум 1-2 предложения) о его фокусе, привычках или прогрессе.
НЕ используй звездочки **.
Верни ответ в формате JSON:
{"category": "self"|"friends"|"work"|"principles", "content": "Текст мысли"}`

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
          temperature: 0.7,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content || ''
        const match = text.match(/\{[\s\S]*?\}/)
        if (match) {
          const parsed = JSON.parse(match[0])
          const cat = ['self', 'friends', 'work', 'principles'].includes(parsed.category)
            ? parsed.category
            : 'self'
          const cleanContent = parsed.content.replace(/\*\*/g, '').trim()
          await addAIThought(cat, cleanContent)
          return NextResponse.json({ success: true, thought: { category: cat, content: cleanContent } })
        }
      }
      return NextResponse.json({ error: 'Failed to reflect' }, { status: 500 })
    }

    // Ручное добавление
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 })
    }

    const clean = content.replace(/\*\*/g, '').trim()
    const ok = await addAIThought(category, clean)
    return NextResponse.json({ success: ok })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    await deleteAIThought(id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

