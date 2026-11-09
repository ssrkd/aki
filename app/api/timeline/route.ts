import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('life_events')
      .select('*')
      .order('event_date', { ascending: false })

    if (error) {
      console.warn('life_events fetch error, table may not exist yet:', error.message)
      return NextResponse.json({ events: [] })
    }

    return NextResponse.json({ events: data || [] })
  } catch (err: any) {
    return NextResponse.json({ events: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, event_date, category, description, importance, people_names } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('life_events')
      .insert({
        title: title.trim(),
        event_date: event_date || new Date().toISOString().split('T')[0],
        category: category || 'turning_point',
        description: description?.trim() || '',
        importance: Number(importance) || 3,
        people_names: people_names?.trim() || '',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ event: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    await supabase.from('life_events').delete().eq('id', id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

