'use client'

interface ProgressBarProps {
  interactionCount: number
  maxInteractions?: number
  isDone?: boolean
}

// Tubo de ensaio que enche conforme o progresso do chat.
// O nível do líquido reflete interactionCount/maxInteractions.
// As bolhinhas sobem em loop enquanto há líquido.
export function ChatProgressBar({ interactionCount, maxInteractions = 20, isDone = false }: ProgressBarProps) {
  const pct = isDone ? 1 : Math.min(interactionCount / maxInteractions, 1)
  const TUBE_H = 80
  const fillH = Math.round(TUBE_H * pct)

  return (
    <>
      <style>{`
        @keyframes tubeBubbles {
          0% {
            box-shadow: 4px -10px rgba(216,180,254,0), 6px 0px rgba(216,180,254,0), 8px -15px rgba(216,180,254,0), 12px 0px rgba(216,180,254,0);
          }
          20% {
            box-shadow: 4px -20px rgba(216,180,254,0), 8px -10px rgba(216,180,254,0), 10px -30px rgba(216,180,254,0.6), 15px -5px rgba(216,180,254,0);
          }
          40% {
            box-shadow: 2px -40px rgba(216,180,254,0.6), 8px -30px rgba(216,180,254,0.5), 8px -55px rgba(216,180,254,0.6), 12px -15px rgba(216,180,254,0.6);
          }
          60% {
            box-shadow: 4px -55px rgba(216,180,254,0.6), 6px -48px rgba(216,180,254,0.5), 10px -68px rgba(216,180,254,0.6), 15px -25px rgba(216,180,254,0.6);
          }
          80% {
            box-shadow: 2px -68px rgba(216,180,254,0.6), 4px -60px rgba(216,180,254,0.5), 8px -75px rgba(216,180,254,0), 12px -35px rgba(216,180,254,0.6);
          }
          100% {
            box-shadow: 4px -75px rgba(216,180,254,0), 8px -70px rgba(216,180,254,0), 10px -78px rgba(216,180,254,0), 15px -45px rgba(216,180,254,0);
          }
        }
        @keyframes tubeGlow {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(168,85,247,0.3)); }
          50% { filter: drop-shadow(0 0 9px rgba(168,85,247,0.6)); }
        }
        .miro-tube {
          width: 24px;
          height: ${TUBE_H}px;
          display: block;
          border: 1px solid rgba(243,232,255,0.55);
          border-radius: 0 0 50px 50px;
          position: relative;
          box-sizing: border-box;
          background-image: linear-gradient(#A855F7 ${TUBE_H}px, transparent 0);
          background-position: 0px ${TUBE_H - fillH}px;
          background-size: 22px ${TUBE_H}px;
          background-repeat: no-repeat;
          transition: background-position 0.8s cubic-bezier(0.4,0,0.2,1);
          animation: tubeGlow 3s ease-in-out infinite;
        }
        .miro-tube::after {
          content: '';
          box-sizing: border-box;
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
          position: absolute;
          border: 1px solid rgba(243,232,255,0.55);
          border-radius: 50%;
          width: 28px;
          height: 6px;
        }
        .miro-tube::before {
          content: '';
          box-sizing: border-box;
          left: 6px;
          bottom: 8px;
          border-radius: 50%;
          position: absolute;
          width: 5px;
          height: 5px;
          animation: tubeBubbles 4s linear infinite;
        }
      `}</style>

      <div className="fixed right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
        <span className="miro-tube" />
        <span className="text-[8px] text-[#F3E8FF]/25 font-mono tabular-nums select-none">
          {isDone ? '✓' : `${interactionCount}/${maxInteractions}`}
        </span>
      </div>
    </>
  )
}
