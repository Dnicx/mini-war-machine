import type { Ability, Phase, Timing, TurnOwner } from '../types/roster'
import { AbilityCard } from './ArmyAbilitiesSection'

// Common abilities (shared datasheet rules like Deadly Demise / Feel No Pain)
// are planned once here; the same editor card as Army Abilities is reused. Each
// card has no sourceUnit, so the shared plan applies to every unit that has it.
interface CommonAbilitiesSectionProps {
  abilities: Ability[]
  onPhaseToggle: (id: string, phase: Phase) => void
  onTimingChange: (id: string, timing: Timing) => void
  onTurnOwnerChange: (id: string, turnOwner: TurnOwner) => void
  onNotesChange: (id: string, notes: string) => void
  onResetAbility: (id: string) => void
  onAbilityRef: (id: string, node: HTMLDivElement | null) => void
}

export function CommonAbilitiesSection({
  abilities,
  onPhaseToggle,
  onTimingChange,
  onTurnOwnerChange,
  onNotesChange,
  onResetAbility,
  onAbilityRef
}: CommonAbilitiesSectionProps) {
  if (abilities.length === 0) return null

  return (
    <div className="space-y-4 mt-6">
      <h2 className="text-lg font-semibold text-text">Common Abilities</h2>
      {abilities.map(ability => (
        <AbilityCard
          key={ability.id}
          ability={ability}
          onPhaseToggle={onPhaseToggle}
          onTimingChange={onTimingChange}
          onTurnOwnerChange={onTurnOwnerChange}
          onNotesChange={onNotesChange}
          onResetAbility={onResetAbility}
          ref={(node) => onAbilityRef(ability.id, node)}
        />
      ))}
    </div>
  )
}
