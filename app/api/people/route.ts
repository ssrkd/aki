import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const peopleList: any[] = []

    // 1. Пробуем прочитать из таблицы people
    try {
      const { data: people, error } = await supabase
        .from('people')
        .select('*')
        .order('last_contact_date', { ascending: false, nullsFirst: false })

      if (!error && people && people.length > 0) {
        people.forEach((p) => peopleList.push(p))
      }
    } catch {}

    // 2. Если в people ничего нет, парсим из ai_memory (категория friends) и notes
    if (peopleList.length === 0) {
      try {
        const { data: mems } = await supabase
          .from('ai_memory')
          .select('id, content, created_at')
          .eq('category', 'friends')

        if (mems && mems.length > 0) {
          mems.forEach((m) => {
            const content = m.content || ''
            // Формат: "Ансар, 18 лет, г. Кызылорда" или "Друг: Ансар..."
            const clean = content.replace(/^Друг:\s*/i, '')
            const parts = clean.split(',').map((s: string) => s.trim())
            const name = parts[0] || 'Друг'

            let age: number | undefined
            let city = ''

            parts.slice(1).forEach((part: string) => {
              const ageMatch = part.match(/(\d+)\s*(?:лет|года|год)?/i)
              if (ageMatch && !age) {
                age = parseInt(ageMatch[1], 10)
              } else if (part.toLowerCase().includes('г.') || part.toLowerCase().includes('город')) {
                city = part.replace(/^г\.\s*/i, '').replace(/^город\s*/i, '')
              } else if (!city) {
                city = part
              }
            })

            peopleList.push({
              id: m.id,
              name,
              relation: 'friend',
              age: age || 18,
              city: city || 'Кызылорда',
              avatar_url: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name)}`,
              last_contact_date: new Date().toISOString().split('T')[0],
              notes: content,
              created_at: m.created_at,
            })
          })
        }
      } catch {}

      // Также читаем из notes
      try {
        const { data: notes } = await supabase
          .from('notes')
          .select('id, title, content, created_at')
          .eq('category', 'friends')

        if (notes && notes.length > 0) {
          notes.forEach((n) => {
            const name = n.title.replace(/^Досье:\s*/i, '').replace(/^Карточка:\s*/i, '').trim()
            if (!peopleList.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
              peopleList.push({
                id: n.id,
                name,
                relation: 'friend',
                avatar_url: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name)}`,
                last_contact_date: new Date().toISOString().split('T')[0],
                notes: n.content,
                created_at: n.created_at,
              })
            }
          })
        }
      } catch {}
    }

    return NextResponse.json({ people: peopleList })
  } catch (err: any) {
    return NextResponse.json({ people: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      nickname = '',
      relation = 'friend',
      age,
      city = '',
      birthday,
      occupation = '',
      how_met = '',
      tastes = '',
      important_people = '',
      goals_problems = '',
      gifts = '',
      debts_promises = '',
      notes = '',
    } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Имя обязательно' }, { status: 400 })
    }

    const avatar_url =
      body.avatar_url ||
      `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name.trim())}`

    const supabase = createServiceClient()

    // Пробуем вставить в people
    try {
      const { data, error } = await supabase
        .from('people')
        .insert({
          name: name.trim(),
          nickname,
          relation,
          age: age ? Number(age) : null,
          city,
          birthday: birthday || null,
          occupation,
          how_met,
          tastes,
          important_people,
          goals_problems,
          gifts,
          debts_promises,
          avatar_url,
          notes,
          last_contact_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single()

      if (!error && data) {
        return NextResponse.json({ person: data })
      }
    } catch {}

    // Fallback в notes и ai_memory
    await Promise.all([
      supabase.from('notes').insert({
        title: `Досье: ${name.trim()}`,
        category: 'friends',
        content: `Имя: ${name}\nВозраст: ${age || ''}\nГород: ${city || ''}\nЗаметки: ${notes}`,
      }),
      supabase.from('ai_memory').insert({
        category: 'friends',
        content: `${name.trim()}, ${age ? age + ' лет, ' : ''}${city ? 'г. ' + city : ''}`,
      }),
    ])

    return NextResponse.json({
      person: {
        id: 'note-' + Date.now(),
        name: name.trim(),
        relation,
        age,
        city,
        avatar_url,
        last_contact_date: new Date().toISOString().split('T')[0],
        notes,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID обязателен' }, { status: 400 })
    }

    const supabase = createServiceClient()
    try {
      const { data, error } = await supabase
        .from('people')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (!error && data) {
        return NextResponse.json({ person: data })
      }
    } catch {}

    return NextResponse.json({ person: { id, ...updates } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID обязателен' }, { status: 400 })
    }

    const supabase = createServiceClient()
    try {
      await supabase.from('people').delete().eq('id', id)
    } catch {}
    try {
      await supabase.from('notes').delete().eq('id', id)
    } catch {}
    try {
      await supabase.from('ai_memory').delete().eq('id', id)
    } catch {}

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
