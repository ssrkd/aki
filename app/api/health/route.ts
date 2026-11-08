import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { addAIThought } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get('key') || req.headers.get('authorization')?.replace('Bearer ', '')
    const validKeys = [
      'aki_cron_secret_srk_2026',
      process.env.CRON_SECRET,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ].filter(Boolean)

    if (key && !validKeys.includes(key) && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      steps,
      sleep_hours,
      active_energy,
      heart_rate,
      distance_km,
      date = new Date().toISOString().split('T')[0],
    } = body

    const supabase = createServiceClient()

    // 1. Проверяем привычки пользователя и закрываем релевантные
    const autoCompletedHabits: string[] = []

    if (steps && steps >= 8000) {
      const { data: stepHabits } = await supabase
        .from('habits')
        .select('id, name')
        .or('name.ilike.%шаг%,name.ilike.%ходьб%,name.ilike.%прогулк%')

      for (const h of stepHabits || []) {
        await supabase.from('habit_logs').upsert({
          habit_id: h.id,
          logged_date: date,
          completed: true,
        })
        autoCompletedHabits.push(h.name)
      }
    }

    if (sleep_hours && sleep_hours >= 7) {
      const { data: sleepHabits } = await supabase
        .from('habits')
        .select('id, name')
        .ilike('name', '%сон%')

      for (const h of sleepHabits || []) {
        await supabase.from('habit_logs').upsert({
          habit_id: h.id,
          logged_date: date,
          completed: true,
        })
        autoCompletedHabits.push(h.name)
      }
    }

    // 2. Записываем в память aki
    const parts = [
      steps ? `${steps.toLocaleString('ru-RU')} шагов` : '',
      sleep_hours ? `сон: ${sleep_hours} ч` : '',
      distance_km ? `${distance_km} км` : '',
      active_energy ? `${active_energy} ккал` : '',
      heart_rate ? `пульс: ${heart_rate} уд/мин` : '',
    ].filter(Boolean)

    if (parts.length > 0) {
      await addAIThought('self', `Показатели Apple Health (${date}): ${parts.join(', ')}`)
    }

    // 3. Отправляем в Telegram Серику
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const { data: users } = await supabase.from('telegram_users').select('chat_id').limit(1)
    const targetChatId = users?.[0]?.chat_id

    if (botToken && targetChatId) {
      let msg = `🍏 <b>Apple Здоровье синхронизировано:</b>\n\n${parts.map((p) => `• ${p}`).join('\n')}`
      if (autoCompletedHabits.length > 0) {
        msg += `\n\n✅ <b>Автоматически закрыты привычки:</b>\n${autoCompletedHabits.map((h) => `• ${h}`).join('\n')}`
      }

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: msg,
          parse_mode: 'HTML',
        }),
      })
    }

    return NextResponse.json({
      success: true,
      data: { steps, sleep_hours, active_energy, date },
      autoCompletedHabits,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
