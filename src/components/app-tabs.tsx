'use client'

import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

const TABS = [
  { path: '/', label: 'Início', icon: '🏠' },
  { path: '/perfil', label: 'Perfil', icon: '👤' },
  { path: '/configuracoes', label: 'Config', icon: '⚙️' },
]

export function AppTabs() {
  const pathname = usePathname()

  // Só mostra tabs se tiver num path que faz sentido
  if (pathname.startsWith('/chat') || pathname.startsWith('/auth') || pathname.startsWith('/resultado')) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-3 pt-1">
      <div className="max-w-md mx-auto bg-[#1A0A33]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl px-2 py-1.5 flex items-center justify-around shadow-[0_-8px_32px_rgba(0,0,0,0.4)]">
        {TABS.map(tab => {
          const isActive = tab.path === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.path)

          return (
            <a
              key={tab.path}
              href={tab.path}
              className="relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-colors min-w-[64px]"
            >
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-0 bg-purple-500/10 border border-purple-500/20 rounded-xl"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10 text-lg">{tab.icon}</span>
              <span
                className={`relative z-10 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-purple-300' : 'text-[#F3E8FF]/30'
                }`}
              >
                {tab.label}
              </span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
