import { useState, type RefObject } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { StratagemCard } from './StratagemCard'
import type { Stratagem, Phase, Timing, TurnOwner } from '../types/roster'

interface StratagemSectionProps {
  coreStratagems: Stratagem[]
  detachmentStratagems: Stratagem[]
  selectedDetachment: string
  onToggleEnable: (id: string, enabled: boolean) => void
  onPhaseToggle: (id: string, phase: Phase, isCore: boolean) => void
  onTimingChange: (id: string, timing: Timing, isCore: boolean) => void
  onTurnOwnerChange: (id: string, turnOwner: TurnOwner, isCore: boolean) => void
  onReset: (id: string, isCore: boolean) => void
  coreRef?: RefObject<HTMLDivElement | null>
  detachmentRef?: RefObject<HTMLDivElement | null>
}

export function StratagemSection({
  coreStratagems,
  detachmentStratagems,
  selectedDetachment,
  onToggleEnable,
  onPhaseToggle,
  onTimingChange,
  onTurnOwnerChange,
  onReset,
  coreRef,
  detachmentRef
}: StratagemSectionProps) {
  const [isCoreCollapsed, setIsCoreCollapsed] = useState(false)
  const [isDetachmentCollapsed, setIsDetachmentCollapsed] = useState(false)

  return (
    <>
      {/* Core Stratagems Section */}
      <div ref={coreRef} className="mb-6">
        <button
          onClick={() => setIsCoreCollapsed(prev => !prev)}
          className="flex items-center gap-2 text-lg font-semibold text-text mb-3 hover:text-accent transition-colors"
        >
          {isCoreCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          Core Stratagems
        </button>
        {!isCoreCollapsed && (
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
        )}
      </div>

      {/* Detachment Stratagems Section */}
      {selectedDetachment && detachmentStratagems.length > 0 && (
        <div ref={detachmentRef} className="mb-6">
          <button
            onClick={() => setIsDetachmentCollapsed(prev => !prev)}
            className="flex items-center gap-2 text-lg font-semibold text-text mb-3 hover:text-accent transition-colors"
          >
            {isDetachmentCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            Detachment Stratagems
          </button>
          {!isDetachmentCollapsed && (
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
          )}
        </div>
      )}
    </>
  )
}
