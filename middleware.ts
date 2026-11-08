import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Публичные пути — не требуют авторизации
  const publicPaths = ['/login', '/api/auth/verify-otp', '/api/telegram']
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))

  if (isPublic) {
    return NextResponse.next()
  }

  // Проверяем наличие сессионной куки
  const session = request.cookies.get('aki_session')

  if (!session) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Применяем middleware ко всем путям кроме:
     * - _next (статические файлы Next.js)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

