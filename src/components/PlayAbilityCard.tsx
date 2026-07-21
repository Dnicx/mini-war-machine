import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Ability, Stratagem } from '../types/roster'
import { SafeMarkdownRenderer } from './SafeMarkdownRenderer'
import { StratagemGridCard } from './StratagemsView'

interface PlayAbilityCardProps {
  ability: Ability
}

export function PlayAbilityCard({ ability }: PlayAbilityCardProps) {
  // Real stratagems carry an `effect`; reuse the Stratagems view card so they
  // look identical everywhere. Custom stratagems have cpCost but no `effect`,
  // so they fall through to the themed card below (showing their description).
  const isStratagem = 'effect' in ability
  if (isStratagem) {
    return <StratagemGridCard stratagem={ability as Stratagem} />
  }

  // Unit abilities (and custom stratagems): collapse to just the title,
  // expanding to the description. Themed to match StratagemGridCard
  // (bg-surface shell + bg-black/40 title bar + uppercase bold name).
  return <UnitAbilityPlayCard ability={ability} />
}

function UnitAbilityPlayCard({ ability }: { ability: Ability }) {
  // Custom stratagems keep their CP badge (no `effect`, so no full layout).
  const hasCp = 'cpCost' in ability
  const cpCost = hasCp ? (ability as Stratagem).cpCost : null
  // Plain abilities with a note start folded (the note is the reminder);
  // custom stratagems stay open so their description shows.
  const [isCollapsed, setIsCollapsed] = useState(!hasCp && Boolean(ability.notes))

  return (
    <div
      onClick={() => setIsCollapsed(prev => !prev)}
      className="bg-surface rounded-lg overflow-hidden cursor-pointer"
    >
      {/* Title bar: matches the stratagem card header */}
      <div className="flex items-center gap-2 bg-black/40 px-3 py-2 text-left">
        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        <h4 className="font-bold text-text text-sm uppercase flex-1">{ability.name}</h4>
        {hasCp && (
          <span className="text-xs bg-surface2 text-text px-2 py-1 rounded font-bold">
            {cpCost}
          </span>
        )}
      </div>
      {(!isCollapsed || ability.notes) && (
        <div className="p-3 text-sm">
          {!isCollapsed && (
            <SafeMarkdownRenderer
              content={ability.description}
              className="text-text2 text-sm whitespace-pre-wrap"
            />
          )}
          {ability.notes && (
            <p className="text-accent text-sm mt-1 italic">Note: {ability.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}
