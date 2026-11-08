import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { data: people, error } = await supabase
      .from('people')
      .select('*')
      .order('last_contact_date', { ascending: false, nullsFirst: false })

    if (error) {
      return NextResponse.json({ people: [] })
    }

    return NextResponse.json({ people: people || [] })
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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ person: data })
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
    const { data, error } = await supabase
      .from('people')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ person: data })
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
    const { error } = await supabase.from('people').delete().eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
