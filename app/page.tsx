import { redirect } from 'next/navigation'

// Корневая страница — редирект на раздел привычек
export default function Home() {
  redirect('/habits')
}

