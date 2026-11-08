import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'aki — личный трекер',
  description: 'Привычки, цели, финансы и многое другое',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="font-sans antialiased bg-[#F3F4F6] text-[#111827]">{children}</body>
    </html>
  )
}
