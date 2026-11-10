import { redirect } from 'next/navigation'

// Корневая страница — редирект на блокнот
export default function Home() {
  redirect('/notebook')
}

