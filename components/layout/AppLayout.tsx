import Sidebar from './Sidebar'
import Header from './Header'

interface AppLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F3F4F6]">
      {/* Левый сайдбар */}
      <Sidebar />

      {/* Основной контент */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
