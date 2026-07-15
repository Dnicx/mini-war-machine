import { useRef } from 'react'
import { ChevronDown, ChevronUp, Camera } from 'lucide-react'
import type { Ability, Phase, Timing, TurnOwner } from '../types/roster'
import { effectiveTurnOwner } from '../lib/turnOwnerHeuristics'
import { SafeMarkdownRenderer } from './SafeMarkdownRenderer'

// Normalize a unit/datasheet name for comparison: uppercase, collapse whitespace.
function normalizeUnitName(name: string): string {
  return name.toUpperCase().replace(/\s+/g, ' ').trim()
}

// A Leader's ability lists the datasheets it can attach to as bulleted lines
// after "following units:". Extract those names so the "Attach to..." dropdown
// can be filtered. Returns null when no list is found (caller shows all units).
function extractAttachableUnitNames(abilities: Ability[]): Set<string> | null {
  const leaderAbility = abilities.find(a => /can be attached to the following units/i.test(a.description))
  if (!leaderAbility) return null

  const names = new Set<string>()
  for (const line of leaderAbility.description.split('\n')) {
    // Bulleted lines (■ ▪ • ▫ or -) hold the unit names; the trailing
    // explanatory paragraph has no bullet and is skipped.
    const match = line.match(/^\s*[■▪•▫-]\s*(.+?)\s*$/)
    if (match) names.add(normalizeUnitName(match[1]))
  }
  return names.size > 0 ? names : null
}

function resizeImage(file: File, maxPx: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target!.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface UnitAbilitiesSectionProps {
  units: Array<{
    id: string
    name: string
    abilities: Ability[]
  }>
  collapsedUnits: Set<string>
  onToggleCollapse: (unitId: string) => void
  onPhaseToggle: (id: string, phase: Phase) => void
  onTimingChange: (id: string, timing: Timing) => void
  onTurnOwnerChange: (id: string, turnOwner: TurnOwner) => void
  onNotesChange: (id: string, notes: string) => void
  onResetAbility: (id: string) => void
  onAbilityRef: (id: string, node: HTMLDivElement | null) => void
  unitImages?: Record<string, string>
  onImagesChange?: (images: Record<string, string>) => void
  attachableUnits?: Array<{ id: string; name: string }>
  attachments?: Record<string, string>
  onAttachmentChange?: (leaderId: string, hostId: string) => void
}

export function UnitAbilitiesSection({
  units,
  collapsedUnits,
  onToggleCollapse,
  onPhaseToggle,
  onTimingChange,
  onTurnOwnerChange,
  onNotesChange,
  onResetAbility,
  onAbilityRef,
  unitImages,
  onImagesChange,
  attachableUnits,
  attachments,
  onAttachmentChange
}: UnitAbilitiesSectionProps) {
  const unitsWithAbilities = units.filter(unit => unit.abilities.length > 0)

  if (unitsWithAbilities.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text mt-6">Unit Abilities</h2>
      {unitsWithAbilities.map(unit => {
        const isLeader = unit.abilities.some(a => /model can be attached/i.test(a.description))
        return (
          <UnitAbilityCard
            key={unit.id}
            unitName={unit.name}
            unitId={unit.id}
            abilities={unit.abilities}
            isCollapsed={collapsedUnits.has(unit.id)}
            onToggleCollapse={onToggleCollapse}
            onPhaseToggle={onPhaseToggle}
            onTimingChange={onTimingChange}
            onTurnOwnerChange={onTurnOwnerChange}
            onNotesChange={onNotesChange}
            onResetAbility={onResetAbility}
            onAbilityRef={onAbilityRef}
            unitImage={unitImages?.[unit.id]}
            onImageChange={onImagesChange ? (dataUrl) => onImagesChange({ ...unitImages, [unit.id]: dataUrl }) : undefined}
            isLeader={isLeader}
            attachableUnits={attachableUnits}
            currentAttachment={isLeader ? attachments?.[unit.id] : undefined}
            onAttachmentChange={isLeader ? (hostId) => onAttachmentChange?.(unit.id, hostId) : undefined}
          />
        )
      })}
    </div>
  )
}

interface UnitAbilityCardProps {
  unitName: string
  unitId: string
  abilities: Ability[]
  isCollapsed: boolean
  onToggleCollapse: (unitId: string) => void
  onPhaseToggle: (id: string, phase: Phase) => void
  onTimingChange: (id: string, timing: Timing) => void
  onTurnOwnerChange: (id: string, turnOwner: TurnOwner) => void
  onNotesChange: (id: string, notes: string) => void
  onResetAbility: (id: string) => void
  onAbilityRef: (id: string, node: HTMLDivElement | null) => void
  unitImage?: string
  onImageChange?: (dataUrl: string) => void
  isLeader?: boolean
  attachableUnits?: Array<{ id: string; name: string }>
  currentAttachment?: string
  onAttachmentChange?: (hostId: string) => void
}

function UnitAbilityCard({
  unitName,
  unitId: _unitId,
  abilities,
  isCollapsed,
  onToggleCollapse,
  onPhaseToggle,
  onTimingChange,
  onTurnOwnerChange,
  onNotesChange,
  onResetAbility,
  onAbilityRef,
  unitImage,
  onImageChange,
  isLeader,
  attachableUnits,
  currentAttachment,
  onAttachmentChange
}: UnitAbilityCardProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onImageChange) return
    try {
      const dataUrl = await resizeImage(file, 512, 0.7)
      onImageChange(dataUrl)
    } catch {
      alert('Failed to process image.')
    }
    e.target.value = ''
  }
  const PHASES: Phase[] = ['Start of Game', 'Start of Battle Round', 'Command', 'Movement', 'Shooting', 'Charge', 'Fight']
  const TIMINGS: Timing[] = ['start', 'beforeTarget', 'attacking/saving', 'afterTargeted', 'end']

  const unitId = _unitId
  // Datasheets this leader may attach to, per its ability text (null = no list).
  const allowedUnitNames = extractAttachableUnitNames(abilities)
  return (
    <div className="bg-surface p-4 rounded-lg border-l-4 border-surface2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {unitImage ? (
            <img src={unitImage} alt={unitName} className="w-8 h-8 rounded object-cover flex-shrink-0" />
          ) : null}
          <button
            onClick={() => onToggleCollapse(unitId)}
            className="text-md font-semibold text-text hover:text-accent transition-colors text-left truncate"
          >
            {unitName}
          </button>
          {onImageChange && (
            <>
              <button
                onClick={() => imageInputRef.current?.click()}
                className="text-text2 hover:text-accent transition-colors flex-shrink-0"
                title="Upload unit image"
              >
                <Camera size={14} />
              </button>
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </>
          )}
        </div>
        <button
          onClick={() => onToggleCollapse(unitId)}
          className="text-text2 hover:text-accent transition-colors flex-shrink-0"
        >
          {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>
      {isLeader && attachableUnits && onAttachmentChange && (
        <div className="mb-3">
          <select
            value={currentAttachment ?? ''}
            onChange={e => onAttachmentChange(e.target.value)}
            className="w-full text-xs bg-surface2 border border-surface2 rounded px-2 py-1 text-text"
          >
            <option value="">Attach to...</option>
            {attachableUnits
              .filter(u => u.id !== unitId)
              // Restrict to datasheets named in this leader's ability; if the
              // ability has no parseable list, allowedUnitNames is null → show all.
              .filter(u => !allowedUnitNames || allowedUnitNames.has(normalizeUnitName(u.name)))
              .map(u => <option key={u.id} value={u.id}>{u.name}</option>)
            }
          </select>
        </div>
      )}
      {!isCollapsed && (
        <div className="space-y-4 mt-3">
          {abilities.map(ability => {
              const hasEmptyPhases = !ability.phases || ability.phases.length === 0
              return (
                <div
                  key={ability.id}
                  ref={(node) => onAbilityRef(ability.id, node)}
                  className={`border-b border-surface2/50 pb-4 last:border-0 last:pb-0 ${hasEmptyPhases ? 'pl-4 !border-l-4 !border-l-red-500' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-text">{ability.name}</h4>
                    <div className="flex gap-2">
                      {(ability.phases || []).length > 0 && (
                        <span className="text-xs bg-surface2 text-text2 px-2 py-1 rounded">
                          {(ability.phases || []).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mb-3 p-3 bg-surface2/50 rounded-lg">
                    <SafeMarkdownRenderer content={ability.description} className="text-text2 text-sm whitespace-pre-wrap" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-text2">Phases</label>
                        {(JSON.stringify(ability.phases) !== JSON.stringify(ability.autoDetectedPhases) || ability.timing !== ability.autoDetectedTiming || ability.turnOwner !== ability.autoDetectedTurnOwner) && (
                          <button
                            onClick={() => onResetAbility(ability.id)}
                            className="text-xs text-accent hover:text-accent/80"
                          >
                            auto
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {PHASES.map(phase => {
                          const autoPhases = ability.autoDetectedPhases || []
                          const currentPhases = ability.phases || []
                          const isAutoSuggested = autoPhases.includes(phase)
                          const isChecked = currentPhases.includes(phase)

                          return (
                            <label key={phase} className="flex items-center gap-2 text-sm text-text">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => onPhaseToggle(ability.id, phase)}
                                className={isAutoSuggested ? 'accent-surface2' : 'accent-accent'}
                              />
                              <span className={isAutoSuggested ? 'text-text2' : ''}>
                                {phase}
                                {isAutoSuggested && <span className="ml-1 text-xs text-text2">(auto)</span>}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-text2 block mb-1">Timing</label>
                        <select
                          value={ability.timing || ability.autoDetectedTiming || ''}
                          onChange={(e) => onTimingChange(ability.id, e.target.value as Timing)}
                          className="w-full px-2 py-1 bg-surface2 border border-surface2 rounded text-text text-sm focus:outline-none focus:border-accent"
                        >
                          <option value="">Auto ({ability.autoDetectedTiming || 'None'})</option>
                          {TIMINGS.map(timing => (
                            <option key={timing} value={timing}>{timing}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-text2 block mb-1">Turn</label>
                        <select
                          value={effectiveTurnOwner(ability)}
                          onChange={(e) => onTurnOwnerChange(ability.id, e.target.value as TurnOwner)}
                          className="w-full px-2 py-1 bg-surface2 border border-surface2 rounded text-text text-sm focus:outline-none focus:border-accent"
                        >
                          <option value="yours">Yours</option>
                          <option value="opponent">Opponent</option>
                          <option value="either">Either</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={ability.notes || ''}
                    onChange={(e) => onNotesChange(ability.id, e.target.value)}
                    placeholder="Add notes..."
                    className="w-full px-3 py-1 bg-surface2 border border-surface2 rounded text-text placeholder-text2 text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              )
            })}
          </div>
      )}
    </div>
  )
}
