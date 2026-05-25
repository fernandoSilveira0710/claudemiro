'use client'

import { useEffect, useRef } from 'react'

export function ClaudemiroBot({ className }: { className?: string }) {
  const botRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bot = botRef.current
    if (!bot) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = bot.getBoundingClientRect()
      const botX = rect.left + rect.width / 2
      const botY = rect.top + rect.height / 2

      const diffX = e.clientX - botX
      const diffY = e.clientY - botY

      const maxMoveX = window.innerWidth / 2
      const maxMoveY = window.innerHeight / 2

      const ratioX = Math.max(-1, Math.min(1, diffX / maxMoveX))
      const ratioY = Math.max(-1, Math.min(1, diffY / maxMoveY))

      const faceX = (ratioX * 12).toFixed(2) + '%'
      const eyeX = (ratioX * 25).toFixed(2) + '%'
      const earLeftWidth = (1 - ratioX * 0.5).toFixed(2)
      const earRightWidth = (1 + ratioX * 0.5).toFixed(2)
      const faceY = (ratioY * 15).toFixed(2) + '%'
      const eyeY = (ratioY * 20).toFixed(2) + '%'

      bot.style.setProperty('--fx', faceX)
      bot.style.setProperty('--fy', faceY)
      bot.style.setProperty('--erx', eyeX)
      bot.style.setProperty('--ery', eyeY)
      bot.style.setProperty('--ealw', earLeftWidth)
      bot.style.setProperty('--earw', earRightWidth)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div ref={botRef} className={`claude-bot ${className || ''}`}>
      <div className="head">
        <div className="face">
          <div className="eyes" />
          <div className="mouth" />
        </div>
      </div>
    </div>
  )
}
