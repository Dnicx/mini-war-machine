import { StratagemCard } from './StratagemCard'
import type { Stratagem } from '../types/roster'

interface StratagemSectionProps {
  coreStratagems: Stratagem[]
  detachmentStratagems: Stratagem[]
  selectedDetachment: string
  onToggleEnable: (id: string, enabled: boolean) => void
  onPhaseToggle: (id: string, phase: string, isCore: boolean) => void
  onTimingChange: (id: string, timing: string, isCore: boolean) => void
  onTurnOwnerChange: (id: string, turnOwner: string, isCore: boolean) => void
  onReset: (id: string, isCore: boolean) => void
}

export function StratagemSection({
  coreStratagems,
  detachmentStratagems,
  selectedDetachment,
  onToggleEnable,
  onPhaseToggle,
  onTimingChange,
  onTurnOwnerChange,
  onReset
}: StratagemSectionProps) {
  return (
    <>
      {/* Core Stratagems Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-text mb-3">Core Stratagems</h2>
        <div className="space-y-4">
          {coreStratagems.map(stratagem => (
            <StratagemCard
              key={stratagem.id}
              stratagem={stratagem}
              type="core"
              onToggleEnable={onToggleEnable}
              onPhaseToggle={(id, phase) => onPhaseToggle(id, phase, true)}
              onTimingChange={(id, timing) => onTimingChange(id, timing, true)}
              onTurnOwnerChange={(id, turnOwner) => onTurnOwnerChange(id, turnOwner, true)}
              onReset={(id) => onReset(id, true)}
            />
          ))}
        </div>
      </div>

      {/* Detachment Stratagems Section */}
      {selectedDetachment && detachmentStratagems.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-text mb-3">Detachment Stratagems</h2>
          <div className="space-y-4">
            {detachmentStratagems.map(stratagem => (
              <StratagemCard
                key={stratagem.id}
                stratagem={stratagem}
                type="detachment"
                onPhaseToggle={(id, phase) => onPhaseToggle(id, phase, false)}
                onTimingChange={(id, timing) => onTimingChange(id, timing, false)}
                onTurnOwnerChange={(id, turnOwner) => onTurnOwnerChange(id, turnOwner, false)}
                onReset={(id) => onReset(id, false)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
