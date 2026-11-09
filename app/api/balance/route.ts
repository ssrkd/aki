import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const month = req.nextUrl.searchParams.get('month')

    let query = supabase.from('balance_wheel').select('*').order('month', { ascending: false })
    if (month) {
      query = query.eq('month', month)
    }

    const { data, error } = await query

    if (error) {
      console.warn('balance_wheel fetch error:', error.message)
      return NextResponse.json({ records: [] })
    }

    return NextResponse.json({ records: data || [] })
  } catch (err: any) {
    return NextResponse.json({ records: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      month = new Date().toISOString().slice(0, 7),
      career = 5,
      health = 5,
      friends = 5,
      family = 5,
      finances = 5,
      development = 5,
      rest = 5,
      discipline = 5,
      notes = '',
    } = body

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('balance_wheel')
      .upsert(
        {
          month,
          career: Math.min(10, Math.max(1, Number(career) || 5)),
          health: Math.min(10, Math.max(1, Number(health) || 5)),
          friends: Math.min(10, Math.max(1, Number(friends) || 5)),
          family: Math.min(10, Math.max(1, Number(family) || 5)),
          finances: Math.min(10, Math.max(1, Number(finances) || 5)),
          development: Math.min(10, Math.max(1, Number(development) || 5)),
          rest: Math.min(10, Math.max(1, Number(rest) || 5)),
          discipline: Math.min(10, Math.max(1, Number(discipline) || 5)),
          notes: notes?.trim() || '',
        },
        { onConflict: 'month' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ record: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
