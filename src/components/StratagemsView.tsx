import { Flag, RotateCcw, Crown, Move, Crosshair, Zap, Swords } from 'lucide-react'
import type { Stratagem, Phase, TurnOwner } from '../types/roster'

const PHASES: Phase[] = [
  'Start of Game', 'Start of Battle Round', 'Command', 'Movement', 'Shooting', 'Charge', 'Fight'
]

const PHASE_ICONS: Record<Phase, typeof Flag> = {
  'Start of Game': Flag,
  'Start of Battle Round': RotateCcw,
  'Command': Crown,
  'Movement': Move,
  'Shooting': Crosshair,
  'Charge': Zap,
  'Fight': Swords
}

// Same turn-owner colors as StratagemCard (and the rulebook convention:
// blue = your turn, red = opponent's turn, green = either player's turn)
const TURN_GROUPS: { owner: TurnOwner; label: string; bandColor: string }[] = [
  { owner: 'yours', label: 'Your Turn', bandColor: 'bg-blue-500' },
  { owner: 'opponent', label: "Opponent's Turn", bandColor: 'bg-red-500' },
  { owner: 'either', label: 'Either Turn', bandColor: 'bg-green-500' }
]

function turnOwnerOf(stratagem: Stratagem): TurnOwner {
  return stratagem.turnOwner || stratagem.autoDetectedTurnOwner || 'yours'
}

function phasesOf(stratagem: Stratagem): Phase[] {
  return stratagem.phases || stratagem.autoDetectedPhases || []
}

interface StratagemsViewProps {
  coreStratagems: Stratagem[]
  detachmentStratagems: Stratagem[]
}

export function StratagemsView({ coreStratagems, detachmentStratagems }: StratagemsViewProps) {
  const all = [...coreStratagems, ...detachmentStratagems]

  return (
    <div className="space-y-6">
      {all.length === 0 && (
        <p className="text-text2 text-center py-8">No stratagems available</p>
      )}
      {TURN_GROUPS.map(group => {
        const inTurn = all.filter(s => turnOwnerOf(s) === group.owner)
        if (inTurn.length === 0) return null

        // A stratagem usable in several phases appears under each of them
        const phaseBuckets = PHASES
          .map(phase => ({
            phase,
            stratagems: inTurn.filter(s => phasesOf(s).includes(phase))
          }))
          .filter(bucket => bucket.stratagems.length > 0)
        const anyPhase = inTurn.filter(s => phasesOf(s).length === 0)

        return (
          <div key={group.owner}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-3 h-3 rounded-full ${group.bandColor}`} />
              <h2 className="text-lg font-bold text-text uppercase">{group.label}</h2>
            </div>
            <div className="space-y-4">
              {phaseBuckets.map(({ phase, stratagems }) => {
                const PhaseIcon = PHASE_ICONS[phase]
                return (
                  <div key={phase}>
                    <div className="flex items-center gap-2 mb-2 text-text2">
                      <PhaseIcon size={16} />
                      <h3 className="text-sm font-semibold uppercase">{phase} Phase</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {stratagems.map(stratagem => (
                        <StratagemGridCard
                          key={stratagem.id}
                          stratagem={stratagem}
                          bandColor={group.bandColor}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
              {anyPhase.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold uppercase text-text2 mb-2">Any Phase</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {anyPhase.map(stratagem => (
                      <StratagemGridCard
                        key={stratagem.id}
                        stratagem={stratagem}
                        bandColor={group.bandColor}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface StratagemGridCardProps {
  stratagem: Stratagem
  bandColor: string
}

function StratagemGridCard({ stratagem, bandColor }: StratagemGridCardProps) {
  const phases = phasesOf(stratagem)

  return (
    <div className="bg-surface rounded-lg overflow-hidden flex">
      <div className="flex-1 min-w-0">
        {/* Title bar: name + CP cost, like the rulebook card header */}
        <div className="flex items-center justify-between gap-2 bg-black/40 px-3 py-2">
          <h4 className="font-bold text-text text-sm uppercase">{stratagem.name}</h4>
          <span className="font-bold text-text text-sm whitespace-nowrap">
            {stratagem.cpCost}
          </span>
        </div>
        {/* Turn-owner colored band with the stratagem's source */}
        <div className={`px-3 py-0.5 text-[10px] font-bold text-white uppercase ${bandColor}`}>
          {stratagem.type} Stratagem
        </div>
        <div className="p-3 text-sm space-y-2">
          <p>
            <span className="font-bold text-text uppercase text-xs">When: </span>
            <span className="text-text2">{stratagem.when}</span>
          </p>
          {stratagem.target && (
            <p>
              <span className="font-bold text-text uppercase text-xs">Target: </span>
              <span className="text-text2">{stratagem.target}</span>
            </p>
          )}
          <p>
            <span className="font-bold text-text uppercase text-xs">Effect: </span>
            <span className="text-text2">{stratagem.effect}</span>
          </p>
          {stratagem.restrictions && (
            <p>
              <span className="font-bold text-text uppercase text-xs">Restrictions: </span>
              <span className="text-text2">{stratagem.restrictions}</span>
            </p>
          )}
        </div>
      </div>
      {/* Phase icon strip, like the rulebook card's right edge */}
      <div className="w-9 bg-surface2 flex flex-col items-center gap-3 py-3 flex-shrink-0">
        {phases.map(phase => {
          const PhaseIcon = PHASE_ICONS[phase]
          return <PhaseIcon key={phase} size={18} className="text-text2" />
        })}
      </div>
    </div>
  )
}
