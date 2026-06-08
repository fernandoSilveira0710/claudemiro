'use client'

interface Goal {
  id: string
  emoji: string
  label: string
  verified?: boolean
  done?: boolean
}
interface Progression {
  overall_delta: number
  goals_met: number
  goals_total: number
}

interface GoalsPanelProps {
  goals?: Goal[]
  progression?: Progression | null
  primary?: string
}

export function GoalsPanel({ goals, progression, primary = '#8B5CF6' }: GoalsPanelProps) {
  const hasGoals = goals && goals.length > 0
  if (!hasGoals && !progression) return null

  return (
    <div className="w-full space-y-4">
      {/* progressão geral */}
      {progression && progression.goals_total > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white font-black text-sm">Sua evolução</h3>
            {progression.overall_delta !== 0 && (
              <span className={`font-black text-sm ${progression.overall_delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {progression.overall_delta > 0 ? '▲' : '▼'} {Math.abs(progression.overall_delta)} no geral
              </span>
            )}
          </div>
          <p className="text-[#F3E8FF]/50 text-xs">
            Você cumpriu <span className="text-white font-bold">{progression.goals_met}</span> de{' '}
            <span className="text-white font-bold">{progression.goals_total}</span> metas da rodada anterior.
          </p>
        </div>
      )}

      {/* próximas metas */}
      {hasGoals && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎯</span>
            <h3 className="text-white font-black text-sm">Metas pra próxima evolução</h3>
          </div>
          <div className="space-y-2">
            {goals!.map(g => (
              <div key={g.id} className="flex items-center gap-3 bg-white/[0.02] rounded-xl px-3 py-2.5">
                <span className="text-lg shrink-0">{g.emoji}</span>
                <span className={`flex-1 text-sm ${g.done ? 'text-green-400 line-through' : 'text-[#F3E8FF]/80'}`}>
                  {g.label}
                </span>
                {/* selo: verificada (API) x na honra (declarativa) */}
                {g.verified === false ? (
                  <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    na honra
                  </span>
                ) : (
                  <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-300/80 border border-green-500/20">
                    auto
                  </span>
                )}
                {g.done && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </div>
            ))}
          </div>
          <p className="text-[#F3E8FF]/30 text-[11px] mt-3" style={{ color: `${primary}99` }}>
            Metas <span className="text-green-300/70">auto</span> são checadas pela API. As <span className="text-amber-300">na honra</span> você confirma no peito. Refaça em 5 dias pra ver o card evoluir.
          </p>
        </div>
      )}
    </div>
  )
}
