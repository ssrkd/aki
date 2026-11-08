import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getSessionCookieOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()

    // Валидация формата
    if (!code || !/^\d{4}$/.test(code)) {
      return NextResponse.json({ error: 'Неверный формат кода' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Ищем действующий OTP код (самый свежий)
    const { data, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    const validOtp = data && data.length > 0 ? data[0] : null

    if (error || !validOtp) {
      console.error('Ошибка верификации OTP:', error || 'Код не найден или истёк')
      return NextResponse.json({ error: 'Неверный или истёкший код' }, { status: 401 })
    }

    // Помечаем код как использованный
    await supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('id', validOtp.id)

    // Устанавливаем сессионную куку
    const { name, value, options } = getSessionCookieOptions()
    const response = NextResponse.json({ success: true })
    response.cookies.set(name, value, options)

    return response
  } catch (err) {
    console.error('Ошибка верификации OTP:', err)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
