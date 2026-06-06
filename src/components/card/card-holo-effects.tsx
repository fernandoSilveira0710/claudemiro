'use client'

import { useRef, useCallback, useState, useEffect, type MouseEvent, type TouchEvent } from 'react'

// ═══════════════════════════════════════════════════════════
// Todas as camadas holográficas — extraídas do Pokémon TCG
// ═══════════════════════════════════════════════════════════

type Rarity = 'COMMON' | 'UNCOMMON' | 'REVERSE_HOLO' | 'RARE_HOLO' | 'GALAXY' | 'RAINBOW' | 'GOLD' | 'RADIANT'

function clamp(v: number, mn: number, mx: number) { return Math.max(mn, Math.min(mx, v)) }

interface HoloEffectsProps {
  rarity: Rarity
  className?: string
}

export function CardHoloEffects({ rarity, className = '' }: HoloEffectsProps) {
  const ref = useRef<HTMLDivElement>(null)
  const raf = useRef<number | null>(null)
  const [css, setCss] = useState<Record<string, string>>({
    '--mx': '50%', '--my': '50%', '--hyp': '0',
    '--rx': '0deg', '--ry': '0deg',
  })

  const update = useCallback((clientX: number, clientY: number) => {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    const px = clamp(((clientX - r.left) / r.width) * 100, 0, 100)
    const py = clamp(((clientY - r.top) / r.height) * 100, 0, 100)
    const cx = px - 50, cy = py - 50
    setCss({
      '--mx': `${px}%`, '--my': `${py}%`,
      '--hyp': (Math.sqrt(cx*cx+cy*cy)/50).toFixed(2),
      '--rx': `${-cy / 3}deg`, '--ry': `${cx / 3}deg`,
    })
  }, [])

  const reset = useCallback(() => {
    setCss({ '--mx':'50%','--my':'50%','--hyp':'0','--rx':'0deg','--ry':'0deg' })
  }, [])

  const onMove = (e: MouseEvent) => {
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => update(e.clientX, e.clientY))
  }
  const onTouch = (e: TouchEvent) => {
    e.preventDefault()
    const t = e.touches[0]
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => update(t.clientX, t.clientY))
  }

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])

  if (rarity === 'COMMON') {
    // Só glare básico
    return (
      <div
        ref={ref} onMouseMove={onMove} onMouseLeave={reset} onTouchMove={onTouch} onTouchEnd={reset}
        style={css}
        className={`absolute inset-0 z-[5] pointer-events-none rounded-3xl overflow-hidden ${className}`}
      >
        <div style={{
          position:'absolute', inset:0,
          backgroundImage: `radial-gradient(farthest-corner circle at var(--mx) var(--my), rgba(222,245,250,0.4) 5%, rgba(255,255,255,0.15) 15%, rgba(0,0,0,0.3) 80%)`,
        }} />
      </div>
    )
  }

  if (rarity === 'UNCOMMON') {
    // Glare + shine sutil
    return (
      <div
        ref={ref} onMouseMove={onMove} onMouseLeave={reset} onTouchMove={onTouch} onTouchEnd={reset}
        style={css}
        className={`absolute inset-0 z-[2] pointer-events-none rounded-3xl overflow-hidden ${className}`}
      >
        <div style={{
          position:'absolute', inset:0,
          backgroundImage: `
            radial-gradient(farthest-corner circle at var(--mx) var(--my), rgba(222,245,250,0.5) 5%, rgba(255,255,255,0.2) 15%, rgba(0,0,0,0.4) 80%)
          `,
        }} />
        <div style={{
          position:'absolute', inset:0,
          backgroundImage: `linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.06) 45%, rgba(168,85,247,0.1) 50%, rgba(255,255,255,0.06) 55%, transparent 65%)`,
          animation: 'shimmerSweep 4s ease-in-out infinite',
        }} />
      </div>
    )
  }

  if (rarity === 'REVERSE_HOLO') {
    // Foil + mask + glare
    return (
      <div
        ref={ref} onMouseMove={onMove} onMouseLeave={reset} onTouchMove={onTouch} onTouchEnd={reset}
        style={css}
        className={`absolute inset-0 z-[1] pointer-events-none rounded-3xl overflow-hidden ${className}`}
      >
        {/* foil */}
        <div style={{
          position:'absolute', inset:0, clipPath: 'inset(10% 8% 52% 8% round 8px)',
          backgroundImage: `
            repeating-linear-gradient(90deg, rgba(168,85,247,0.2) 0%, rgba(236,72,153,0.2) 25%, rgba(245,158,11,0.15) 50%, rgba(34,211,238,0.2) 75%, rgba(168,85,247,0.2) 100%),
            repeating-linear-gradient(0deg, rgba(0,0,0,0.6) 28px, rgba(255,255,255,0.3) 42px, rgba(0,0,0,0.6) 49px, rgba(255,255,255,0.3) 56px, rgba(0,0,0,0.6) 70px, rgba(0,0,0,0.6) 168px),
            radial-gradient(farthest-corner circle at var(--mx) var(--my), rgba(255,255,255,0.7) 0%, rgba(200,200,200,0.2) 25%, rgba(0,0,0,0.6) 80%)
          `,
          backgroundBlendMode: 'overlay, screen, normal',
          backgroundPosition: 'center, calc(var(--mx)*-0.6) var(--my), center',
          backgroundSize: '100% 100%, 180% 180%, 120% 120%',
          filter: 'brightness(1.1) contrast(1.5) saturate(0.8)',
        }} />
        {/* glare */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage: `radial-gradient(farthest-corner circle at var(--mx) var(--my), rgba(255,255,255,0.5) 0%, rgba(168,85,247,0.2) 20%, rgba(0,0,0,0.5) 80%)`,
        }} />
      </div>
    )
  }

  if (rarity === 'RARE_HOLO') {
    // Barras holográficas + arco-íris (o clássico)
    return (
      <div
        ref={ref} onMouseMove={onMove} onMouseLeave={reset} onTouchMove={onTouch} onTouchEnd={reset}
        style={css}
        className={`absolute inset-0 z-[2] pointer-events-none rounded-3xl overflow-hidden ${className}`}
      >
        <div style={{
          position:'absolute', inset:0, clipPath: 'inset(10% 8% 52% 8% round 8px)',
          backgroundImage: `
            repeating-linear-gradient(90deg,
              hsl(270,70%,55%) 0%, hsl(270,70%,55%) 3%, #000 3.01%, #000 5.99%,
              hsl(310,70%,55%) 6%, hsl(310,70%,55%) 9%, #000 9.01%, #000 11.99%,
              hsl(30,70%,55%) 12%, hsl(30,70%,55%) 15%, #000 15.01%, #000 17.99%,
              hsl(190,70%,55%) 18%, hsl(190,70%,55%) 21%, #000 21.01%, #000 23.99%
            ),
            repeating-linear-gradient(90deg, #A855F7, #EC4899, #F59E0B, #22D3EE, #A855F7),
            repeating-linear-gradient(0deg, rgba(10,10,10,0.85) 56px, rgba(255,255,255,0.6) 84px, rgba(10,10,10,0.85) 98px, rgba(255,255,255,0.6) 112px, rgba(10,10,10,0.85) 140px, rgba(10,10,10,0.85) 336px),
            repeating-linear-gradient(0deg, rgba(10,10,10,0.85) 56px, rgba(255,255,255,0.6) 84px, rgba(10,10,10,0.85) 98px, rgba(255,255,255,0.6) 112px, rgba(10,10,10,0.85) 140px, rgba(10,10,10,0.85) 252px),
            radial-gradient(farthest-corner circle at var(--mx) var(--my), rgba(230,230,230,0.85) 0%, rgba(200,200,200,0.1) 25%, rgb(0,0,0) 90%)
          `,
          backgroundBlendMode: 'soft-light, soft-light, screen, overlay, normal',
          backgroundPosition: 'center, calc(((50%-var(--mx))*25)+50%) center, calc(var(--mx)*-1.2) var(--my), center, center',
          backgroundSize: '100% 100%, 200% 200%, 237% 237%, 195% 195%, 120% 120%',
          filter: 'brightness(calc((var(--hyp)+0.7)*0.7)) contrast(3.2) saturate(0.66)',
        }} />
        {/* shimmer sweep */}
        <div style={{
          position:'absolute', inset:0,
          background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.08) 45%, rgba(168,85,247,0.15) 50%, rgba(255,255,255,0.08) 55%, transparent 65%)',
          animation: 'shimmerSweep 4s ease-in-out infinite',
        }} />
      </div>
    )
  }

  if (rarity === 'GALAXY') {
    // Cosmos/galaxy — o mais impressionante
    return (
      <div
        ref={ref} onMouseMove={onMove} onMouseLeave={reset} onTouchMove={onTouch} onTouchEnd={reset}
        style={css}
        className={`absolute inset-0 z-[2] pointer-events-none rounded-3xl overflow-hidden ${className}`}
      >
        {/* shine galaxy */}
        <div style={{
          position:'absolute', inset:0, clipPath: 'inset(10% 8% 52% 8% round 8px)',
          backgroundImage: `
            repeating-linear-gradient(82deg, rgb(218,56,50) 0%, rgb(219,204,86) 16%, rgb(121,199,58) 33%, rgb(58,192,183) 50%, rgb(71,98,207) 66%, rgb(170,69,209) 83%, rgb(218,56,50) 100%),
            radial-gradient(farthest-corner circle at var(--mx) var(--my), rgba(255,255,255,0.7) 5%, rgba(150,150,150,0.3) 40%, rgb(0,0,0) 100%)
          `,
          backgroundBlendMode: 'color-dodge, screen',
          backgroundPosition: 'calc(((50%-var(--mx))*2.5)+50%) calc(((50%-var(--my))*2.5)+50%), center',
          backgroundSize: '600% 1200%, cover',
          filter: 'brightness(0.8) contrast(1.2) saturate(1.5)',
          mixBlendMode: 'color-dodge' as any,
        }} />
        {/* cosmos particles */}
        <div style={{
          position:'absolute', inset:'-20%',
          backgroundImage: `
            radial-gradient(2px 2px at 15% 20%, rgba(168,85,247,0.9), transparent),
            radial-gradient(1.5px 1.5px at 55% 35%, rgba(255,255,255,0.95), transparent),
            radial-gradient(2.5px 2.5px at 75% 55%, rgba(236,72,153,0.8), transparent),
            radial-gradient(1px 1px at 25% 70%, rgba(34,211,238,0.9), transparent),
            radial-gradient(2px 2px at 60% 80%, rgba(245,158,11,0.7), transparent),
            radial-gradient(1px 1px at 85% 15%, rgba(168,85,247,0.9), transparent),
            radial-gradient(2.5px 2.5px at 40% 45%, rgba(255,255,255,0.85), transparent),
            radial-gradient(1.5px 1.5px at 12% 62%, rgba(236,72,153,0.75), transparent),
            radial-gradient(1px 1px at 70% 28%, rgba(245,158,11,0.8), transparent),
            radial-gradient(2px 2px at 48% 90%, rgba(168,85,247,0.7), transparent)
          `,
          backgroundSize: '130% 130%',
          animation: 'cosmosDrift 8s ease-in-out infinite',
        }} />
        {/* glare */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage: `radial-gradient(farthest-corner circle at var(--mx) var(--my), rgba(222,245,250,0.7) 10%, rgba(255,255,255,0.5) 20%, rgba(0,0,0,0.5) 90%)`,
        }} />
      </div>
    )
  }

  if (rarity === 'RAINBOW') {
    // Glitter arco-íris
    return (
      <div
        ref={ref} onMouseMove={onMove} onMouseLeave={reset} onTouchMove={onTouch} onTouchEnd={reset}
        style={css}
        className={`absolute inset-0 z-[2] pointer-events-none rounded-3xl overflow-hidden ${className}`}
      >
        <div style={{
          position:'absolute', inset:0,
          backgroundImage: `
            repeating-linear-gradient(-20deg, rgb(253,71,65) 0%, rgb(255,243,151) 14%, rgba(168,255,95,1) 28%, rgba(131,255,247,1) 42%, rgb(75,198,255) 57%, rgb(255,73,246) 71%, rgb(255,56,49) 85%),
            repeating-linear-gradient(130deg, rgba(89,46,80,0.5) 0%, rgba(200,180,220,0.6) 2.5%, rgb(223,96,202) 5%, rgba(100,200,220,0.6) 7.5%, rgba(14,21,46,0.5) 10%, rgba(14,21,46,0.5) 15%),
            radial-gradient(farthest-corner circle at var(--mx) var(--my), rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.5) 100%)
          `,
          backgroundBlendMode: 'color-burn, soft-light, normal',
          backgroundPosition: 'center, var(--mx) var(--my), center',
          backgroundSize: '500% 500%, 1000% 1000%, 200% 200%',
          filter: 'brightness(calc((var(--hyp)*0.25)+0.66)) contrast(2) saturate(0.95)',
        }} />
        {/* sparkles ✨ */}
        <div style={{
          position:'absolute', inset:'-10%',
          backgroundImage: `
            radial-gradient(3px 3px at 20% 30%, rgba(255,255,255,0.9), transparent),
            radial-gradient(2px 2px at 60% 40%, rgba(255,215,0,0.9), transparent),
            radial-gradient(2.5px 2.5px at 40% 70%, rgba(255,100,200,0.8), transparent),
            radial-gradient(1.5px 1.5px at 80% 20%, rgba(100,255,255,0.9), transparent),
            radial-gradient(3px 3px at 10% 80%, rgba(255,255,255,0.85), transparent),
            radial-gradient(2px 2px at 70% 60%, rgba(255,215,0,0.8), transparent),
            radial-gradient(2.5px 2.5px at 50% 10%, rgba(255,100,255,0.9), transparent),
            radial-gradient(1.5px 1.5px at 90% 50%, rgba(200,200,255,0.8), transparent)
          `,
          animation: 'sparkleFloat 3s ease-in-out infinite',
        }} />
      </div>
    )
  }

  if (rarity === 'GOLD') {
    // Dourado secreto com glitter — a mais premium, brilha mesmo parada
    return (
      <div
        ref={ref} onMouseMove={onMove} onMouseLeave={reset} onTouchMove={onTouch} onTouchEnd={reset}
        style={css}
        className={`absolute inset-0 z-[2] pointer-events-none rounded-3xl overflow-hidden ${className}`}
      >
        {/* base dourada sempre visível (independe do mouse) */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage: `linear-gradient(135deg, rgba(184,134,11,0.55) 0%, rgba(255,223,128,0.7) 25%, rgba(212,175,55,0.5) 50%, rgba(138,109,26,0.55) 75%, rgba(255,223,128,0.65) 100%)`,
          backgroundSize: '200% 200%',
          animation: 'goldShift 5s ease-in-out infinite',
          mixBlendMode: 'color-dodge' as any,
        }} />
        <div style={{
          position:'absolute', inset:0,
          backgroundImage: `
            repeating-linear-gradient(110deg, rgba(89,46,80,0.5) 0%, rgba(216,183,92,0.85) 2.5%, rgb(255,220,120) 5%, rgba(216,183,92,0.85) 7.5%, rgba(14,21,46,0.5) 10%, rgba(14,21,46,0.5) 15%),
            repeating-linear-gradient(-45deg,
              hsl(0,0%,10%) 0%, hsl(0,0%,10%) 1.2%, hsl(0,0%,20%) 2.4%, hsl(0,0%,35%) 3.6%,
              hsl(0,0%,42.5%) 4.8%, hsl(0,0%,50%) 6%, hsl(0,0%,42.5%) 7.2%, hsl(0,0%,35%) 8.4%,
              hsl(0,0%,20%) 9.6%, hsl(0,0%,10%) 10.8%, hsl(0,0%,0%) 12%
            ),
            repeating-linear-gradient(45deg,
              hsl(0,0%,10%) 0%, hsl(0,0%,10%) 1.2%, hsl(0,0%,20%) 2.4%, hsl(0,0%,35%) 3.6%,
              hsl(0,0%,42.5%) 4.8%, hsl(0,0%,50%) 6%, hsl(0,0%,42.5%) 7.2%, hsl(0,0%,35%) 8.4%,
              hsl(0,0%,20%) 9.6%, hsl(0,0%,10%) 10.8%, hsl(0,0%,0%) 12%
            )
          `,
          backgroundBlendMode: 'color-burn, exclusion, darken',
          backgroundPosition: 'var(--mx) var(--my), calc(((var(--mx)-50%)*1.5)+50%) calc(((var(--my)-50%)*1.5)+50%), calc(((var(--mx)-50%)*1.5)+50%) calc(((var(--my)-50%)*1.5)+50%)',
          backgroundSize: '600% 600%, 210% 210%, 210% 210%',
          filter: 'brightness(calc((var(--hyp)*0.4)+1.05)) contrast(3.2) saturate(1.4)',
          mixBlendMode: 'color-dodge' as any,
        }} />
        {/* gold sparkles */}
        <div style={{
          position:'absolute', inset:'-10%',
          backgroundImage: `
            radial-gradient(2.5px 2.5px at 15% 25%, rgba(255,215,0,1), transparent),
            radial-gradient(2px 2px at 55% 45%, rgba(255,255,200,0.95), transparent),
            radial-gradient(3px 3px at 75% 30%, rgba(245,200,0,0.9), transparent),
            radial-gradient(1.5px 1.5px at 35% 70%, rgba(255,230,100,1), transparent),
            radial-gradient(2.5px 2.5px at 65% 80%, rgba(255,215,0,0.85), transparent),
            radial-gradient(2px 2px at 85% 55%, rgba(255,255,180,0.95), transparent),
            radial-gradient(3px 3px at 20% 55%, rgba(245,200,50,0.9), transparent),
            radial-gradient(1.5px 1.5px at 50% 15%, rgba(255,240,150,0.95), transparent)
          `,
          mixBlendMode: 'screen' as any,
          animation: 'sparkleFloat 4s ease-in-out infinite',
        }} />
      </div>
    )
  }

  if (rarity === 'RADIANT') {
    // Padrão cruzado radiante — iridescente, brilha mesmo parada
    return (
      <div
        ref={ref} onMouseMove={onMove} onMouseLeave={reset} onTouchMove={onTouch} onTouchEnd={reset}
        style={css}
        className={`absolute inset-0 z-[2] pointer-events-none rounded-3xl overflow-hidden ${className}`}
      >
        {/* base iridescente sempre visível */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage: `linear-gradient(135deg, rgba(255,161,158,0.5), rgba(85,178,255,0.5) 25%, rgba(130,255,213,0.5) 50%, rgba(253,170,240,0.5) 75%, rgba(148,241,255,0.5) 100%)`,
          backgroundSize: '250% 250%',
          animation: 'goldShift 6s ease-in-out infinite',
          mixBlendMode: 'color-dodge' as any,
        }} />
        <div style={{
          position:'absolute', inset:0,
          backgroundImage: `
            repeating-linear-gradient(55deg,
              rgb(255,161,158) 0%, rgb(85,178,255) 16%, rgb(255,199,146) 33%,
              rgb(130,255,213) 50%, rgb(253,170,240) 66%, rgb(148,241,255) 83%, rgb(255,161,158) 100%
            ),
            repeating-linear-gradient(-45deg,
              rgba(10,10,10,0.9) 0%, rgba(10,10,10,0.9) 1.2%, rgba(40,40,40,0.8) 2.41%,
              rgba(70,70,70,0.7) 3.61%, rgba(108,108,108,0.6) 4.81%,
              rgba(127,127,127,0.5) 6.01%, rgba(108,108,108,0.6) 7.21%,
              rgba(70,70,70,0.7) 8.41%, rgba(40,40,40,0.8) 9.61%, rgba(10,10,10,0.9) 10.81%
            ),
            repeating-linear-gradient(45deg,
              rgba(10,10,10,0.9) 0%, rgba(10,10,10,0.9) 1.2%, rgba(40,40,40,0.8) 2.41%,
              rgba(70,70,70,0.7) 3.61%, rgba(108,108,108,0.6) 4.81%,
              rgba(127,127,127,0.5) 6.01%, rgba(108,108,108,0.6) 7.21%,
              rgba(70,70,70,0.7) 8.41%, rgba(40,40,40,0.8) 9.61%, rgba(10,10,10,0.9) 10.81%
            )
          `,
          backgroundBlendMode: 'exclusion, darken, color-dodge',
          backgroundPosition: 'calc(((var(--mx)-50%)*-2.5)+50%) calc(((var(--my)-50%)*-2.5)+50%), calc(((var(--mx)-50%)*1.5)+50%) calc(((var(--my)-50%)*1.5)+50%), calc(((var(--mx)-50%)*1.5)+50%) calc(((var(--my)-50%)*1.5)+50%)',
          backgroundSize: '400% 400%, 210% 210%, 210% 210%',
          filter: 'brightness(calc((var(--hyp)*0.3)+1.0)) contrast(4) saturate(1.3)',
          mixBlendMode: 'color-dodge' as any,
        }} />
        {/* sparkles iridescentes */}
        <div style={{
          position:'absolute', inset:'-10%',
          backgroundImage: `
            radial-gradient(2.5px 2.5px at 20% 30%, rgba(255,255,255,0.95), transparent),
            radial-gradient(2px 2px at 60% 40%, rgba(130,255,213,0.9), transparent),
            radial-gradient(2.5px 2.5px at 40% 70%, rgba(253,170,240,0.85), transparent),
            radial-gradient(1.5px 1.5px at 80% 20%, rgba(148,241,255,0.95), transparent),
            radial-gradient(2px 2px at 50% 85%, rgba(255,255,255,0.9), transparent)
          `,
          mixBlendMode: 'screen' as any,
          animation: 'sparkleFloat 3.5s ease-in-out infinite',
        }} />
        {/* glow spot */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage: `radial-gradient(farthest-corner ellipse at calc(((var(--mx))*0.5)+25%) calc(((var(--my))*0.5)+25%), rgba(255,255,255,0.55) 5%, rgba(150,150,150,0.3) 15%, rgba(0,0,0,0.0) 35%)`,
          backgroundSize: '350% 350%',
          mixBlendMode: 'soft-light' as any,
        }} />
      </div>
    )
  }

  return null
}
