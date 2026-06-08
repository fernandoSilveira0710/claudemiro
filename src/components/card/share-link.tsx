'use client'

import { useState } from 'react'
import { Check, Copy, Link as LinkIcon } from 'lucide-react'

export function ShareLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://claudemiro.vercel.app'
  const full = `${origin}${path}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(full)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5">
        <LinkIcon size={16} className="text-[#F3E8FF]/40 shrink-0" />
        <span className="flex-1 text-[#F3E8FF]/60 text-xs font-mono truncate">{full}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors shrink-0"
        >
          {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
        </button>
      </div>
    </div>
  )
}
