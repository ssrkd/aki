import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

function formatICSDate(dateStr: string): string {
  // Формат YYYYMMDD
  return dateStr.replace(/-/g, '')
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Загружаем планы с дедлайнами, цели и дни рождения людей
    const [plansRes, goalsRes, peopleRes] = await Promise.all([
      supabase.from('plans').select('id, title, deadline, status').not('deadline', 'is', null),
      supabase.from('goals').select('id, title, horizon, progress, status').eq('status', 'active'),
      supabase.from('people').select('id, name, relation, birthday').not('birthday', 'is', null),
    ])

    const now = new Date()
    const currentYear = now.getFullYear()
    const dtStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//aki//Personal Life OS//RU',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:aki — Личные планы и цели',
      'X-WR-TIMEZONE:Asia/Almaty',
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
      'X-PUBLISHED-TTL:PT1H',
    ]

    // 1. Дедлайны по планам
    for (const p of plansRes.data || []) {
      if (!p.deadline) continue
      const dateFormatted = formatICSDate(p.deadline)

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:plan-${p.id}@aki.app`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART;VALUE=DATE:${dateFormatted}`,
        `DTEND;VALUE=DATE:${dateFormatted}`,
        `SUMMARY:🎯 Дедлайн: ${p.title}`,
        `DESCRIPTION:Статус плана в aki: ${p.status}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      )
    }

    // 2. Дни рождения людей из карточек
    for (const person of peopleRes.data || []) {
      if (!person.birthday) continue
      // birthday может быть 'YYYY-MM-DD' или 'MM-DD'
      const parts = person.birthday.split('-')
      const mm = parts.length === 3 ? parts[1] : parts[0]
      const dd = parts.length === 3 ? parts[2] : parts[1]
      const thisYearBday = `${currentYear}${mm}${dd}`

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:birthday-${person.id}-${currentYear}@aki.app`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART;VALUE=DATE:${thisYearBday}`,
        `DTEND;VALUE=DATE:${thisYearBday}`,
        `SUMMARY:🎂 День рождения: ${person.name} (${person.relation || 'друг'})`,
        `DESCRIPTION:Не забудь поздравить! Записано в aki.`,
        'STATUS:CONFIRMED',
        'RRULE:FREQ=YEARLY',
        'END:VEVENT'
      )
    }

    icsContent.push('END:VCALENDAR')

    const body = icsContent.join('\r\n')

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="aki-calendar.ics"',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      },
    })
  } catch (err: any) {
    console.error('Ошибка генерации iCalendar:', err)
    return new NextResponse('Error generating calendar', { status: 500 })
  }
}

