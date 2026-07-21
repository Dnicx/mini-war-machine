import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Ability, Stratagem } from '../types/roster'
import { SafeMarkdownRenderer } from './SafeMarkdownRenderer'

interface PlayAbilityCardProps {
  ability: Ability
}

export function PlayAbilityCard({ ability }: PlayAbilityCardProps) {
  // A CP cost makes it stratagem-styled (purple + CP badge). Custom stratagems
  // carry cpCost but no `effect`, so only real stratagems get the WHEN/EFFECT
  // layout — customs fall through to their description.
  const hasCp = 'cpCost' in ability
  const stratagem = 'effect' in ability ? ability as Stratagem : null
  const cpCost = hasCp ? (ability as Stratagem).cpCost : null
  // Real stratagems start folded (CP + effect); custom reminders stay open so
  // their description shows. Plain abilities keep the note-driven fold.
  const [isCollapsed, setIsCollapsed] = useState( !!stratagem || (!hasCp && !!ability.notes) )

  return (
    <div
      onClick={() => setIsCollapsed(prev => !prev)}
      className={`p-3 rounded-lg border-l-4 bg-surface2 cursor-pointer ${
        hasCp ? 'border-purple-500' : 'border-accent'
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 w-full text-left">
          {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          <h4 className="font-semibold text-text flex-1">{ability.name}</h4>
          {hasCp && (
            <span className="text-xs bg-surface2 text-text px-2 py-1 rounded font-bold">
              {cpCost}
            </span>
          )}
        </div>
        {/* Folded stratagem still shows its effect, like the Stratagems view */}
        {stratagem && isCollapsed && (
          <p className="text-text2 text-sm mt-1">
            <span className="font-semibold text-purple-400">EFFECT: </span>{stratagem.effect}
          </p>
        )}
        {!isCollapsed && (
          <>
            {stratagem ? (
              <div className="text-text2 text-sm mt-1">
                <p className="mb-1"><span className="font-semibold text-purple-400">WHEN: </span>{stratagem.when}</p>
                {stratagem.target && <p className="mb-1"><span className="font-semibold text-purple-400">TARGET: </span>{stratagem.target}</p>}
                <p className="mb-1"><span className="font-semibold text-purple-400">EFFECT: </span>{stratagem.effect}</p>
                {stratagem.restrictions && <p className="mb-1"><span className="font-semibold text-purple-400">RESTRICTIONS: </span>{stratagem.restrictions}</p>}
              </div>
            ) : (
              <SafeMarkdownRenderer content={ability.description} className="text-text2 text-sm mt-1 whitespace-pre-wrap" />
            )}
            
          </>
        )}
        {ability.notes && (
          <p className="text-accent text-sm mt-1 italic">Note: {ability.notes}</p>
        )}
      </div>
    </div>
  )
}
