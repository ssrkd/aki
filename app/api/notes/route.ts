import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServiceClient()

    // 1. Получаем заметки из таблицы notes
    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Ошибка чтения notes:', error)
      return NextResponse.json({ notes: [] }, { status: 500 })
    }

    // 2. Если в notes вообще пусто, автоматически раскладываем мысли из ai_memory по полочкам!
    if (!notes || notes.length === 0) {
      try {
        const { data: memories } = await supabase
          .from('ai_memory')
          .select('id, category, content, created_at')
          .order('created_at', { ascending: true })

        if (memories && memories.length > 0) {
          const seededNotes: any[] = []

          // Группируем по категориям
          const grouped: Record<string, string[]> = {
            self: [],
            friends: [],
            principles: [],
            work: [],
          }

          memories.forEach((m) => {
            const cat = m.category || 'self'
            if (!grouped[cat]) grouped[cat] = []
            grouped[cat].push(m.content)
          })

          if (grouped.self.length > 0) {
            seededNotes.push({
              title: 'Обо мне и профиль',
              category: 'self',
              content: grouped.self.map((s) => `• ${s}`).join('\n\n'),
            })
          }

          if (grouped.principles.length > 0) {
            seededNotes.push({
              title: 'Мои жизненные принципы',
              category: 'self',
              content: grouped.principles.map((p) => `• ${p}`).join('\n\n'),
            })
          }

          if (grouped.friends.length > 0) {
            seededNotes.push({
              title: 'Заметки о друзьях и окружении',
              category: 'friends',
              content: grouped.friends.map((f) => `• ${f}`).join('\n\n'),
            })
          }

          if (grouped.work.length > 0) {
            seededNotes.push({
              title: 'Работа, проекты и цели',
              category: 'work',
              content: grouped.work.map((w) => `• ${w}`).join('\n\n'),
            })
          }

          if (seededNotes.length > 0) {
            const { data: inserted } = await supabase
              .from('notes')
              .insert(seededNotes)
              .select('*')

            if (inserted && inserted.length > 0) {
              return NextResponse.json({ notes: inserted })
            }
          }
        }
      } catch (syncErr) {
        console.warn('Ошибка авто-синхронизации ai_memory -> notes:', syncErr)
      }
    }

    return NextResponse.json({ notes: notes || [] })
  } catch (err: any) {
    console.error('Ошибка в GET /api/notes:', err)
    return NextResponse.json({ notes: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const body = await req.json()
    const { title, category = 'self', content = '' } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('notes')
      .insert({
        title: title.trim(),
        category,
        content: content || '',
      })
      .select('*')
      .single()

    if (error) {
      console.error('Ошибка создания заметки:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, note: data })
  } catch (err: any) {
    console.error('Ошибка в POST /api/notes:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const body = await req.json()
    const { id, title, category, content } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updatePayload: any = { updated_at: new Date().toISOString() }
    if (title !== undefined) updatePayload.title = title
    if (category !== undefined) updatePayload.category = category
    if (content !== undefined) updatePayload.content = content

    const { data, error } = await supabase
      .from('notes')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, note: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { error } = await supabase.from('notes').delete().eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

