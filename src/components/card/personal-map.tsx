'use client'

import { motion } from 'framer-motion'

interface MapAxis { axis: string; value: number; comment?: string }
interface PersonalMapProps {
  data: MapAxis[]
  primary?: string
  secondary?: string
}

/** Gráfico radar "mapa pessoal" — onde a pessoa está forte/fraca, com comentários da IA. */
export function PersonalMap({ data, primary = '#A855F7', secondary = '#EC4899' }: PersonalMapProps) {
  if (!data?.length) return null

  const size = 240
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 30
  const n = data.length

  const point = (i: number, r: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r] as const
  }

  const valuePoints = data.map((d, i) => point(i, (Math.max(0, Math.min(100, d.value)) / 100) * radius))
  const polygon = valuePoints.map(([x, y]) => `${x},${y}`).join(' ')
  const rings = [0.25, 0.5, 0.75, 1]

  return (
    <div className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🧭</span>
        <h3 className="text-white font-black text-lg">Mapa Pessoal</h3>
      </div>

      <div className="flex flex-col items-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-56 h-56">
          <defs>
            <linearGradient id="mapFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={primary} stopOpacity="0.5" />
              <stop offset="100%" stopColor={secondary} stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {rings.map((r, ri) => (
            <polygon
              key={ri}
              points={data.map((_, i) => point(i, radius * r).join(',')).join(' ')}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          ))}

          {data.map((_, i) => {
            const [x, y] = point(i, radius)
            return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          })}

          <motion.polygon
            points={polygon}
            fill="url(#mapFill)"
            stroke={primary}
            strokeWidth="2"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: 'spring' }}
            style={{ transformOrigin: 'center' }}
          />

          {valuePoints.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill={secondary} />
          ))}

          {data.map((d, i) => {
            const [x, y] = point(i, radius + 16)
            return (
              <text
                key={i}
                x={x}
                y={y}
                fontSize="9"
                fill="rgba(243,232,255,0.6)"
                textAnchor="middle"
                dominantBaseline="middle"
                fontWeight="700"
              >
                {d.axis}
              </text>
            )
          })}
        </svg>

        <div className="w-full mt-4 space-y-2">
          {data.map((d, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-white font-bold w-28 shrink-0 truncate">{d.axis}</span>
              <span className="text-[#F3E8FF]/50 flex-1">{d.comment}</span>
              <span className="text-white font-black tabular-nums">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
