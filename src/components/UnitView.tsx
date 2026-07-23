import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import type { Roster, Unit, Ability, Phase } from '../types/roster'
import { UnitDetail } from './UnitDetail'

interface UnitViewProps {
  roster: Roster
  unitImages: Record<string, string>
  onImagesChange: (images: Record<string, string>) => void
  attachments?: Record<string, string>
  // Ability notes keyed by ability id (from the saved plan).
  abilityNotes?: Record<string, string>
  // Ability phases keyed by ability id (from heuristics/plan) for phase icons.
  abilityPhases?: Record<string, Phase[]>
  // Common abilities expanded per unit (keyed by unit id) for unit detail.
  commonAbilitiesByUnit?: Record<string, Ability[]>
}

// Keywords hidden in the unit list view (still shown in unit detail).
// Add lowercase names here to suppress them. Prefix-based rules are below.
const REDUNDANT_KEYWORDS = new Set([
  'epic hero',
  'character',
  'imperium',
  'chaos',
])

// Keywords whose names start with any of these prefixes are also hidden.
const REDUNDANT_KEYWORD_PREFIXES = [
  'faction:',
]

function UnitStatBlock({ unit }: { unit: Unit }) {
  const groups = new Map<string, { names: string[]; m: typeof unit.models[0] }>()
  for (const model of unit.models) {
    const key = [model.movement, model.toughness, model.save, model.wounds, model.leadership, model.objectiveControl].join('|')
    const existing = groups.get(key)
    if (existing) existing.names.push(model.name)
    else groups.set(key, { names: [model.name], m: model })
  }
  const entries = Array.from(groups.values())
  const showNames = entries.length > 1

  const invulnValues = [...new Set(unit.models.map(m => m.invulnerableSave).filter(v => v && v !== '-'))]

  return (
    <div>
      <div className="space-y-0.5">
        {entries.map(({ names, m }) => (
          <div key={names.join(',')} className="text-xs leading-relaxed">
            {showNames && (
              <span className="font-semibold text-text">{names.join(' / ')}{'  '}</span>
            )}
            <span className="text-sm/3">
              {[
                ['M', m.movement], ['T', m.toughness], ['Sv', m.save],
                ['W', m.wounds], ['Ld', m.leadership], ['OC', m.objectiveControl],
              ].map(([label, value], i) => (
                <span key={label}>
                  {i > 0 && ' '}
                  <span className="text-text/40">{label} </span>
                  <span className="text-text font-medium">{value}</span>
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
      {invulnValues.length > 0 && (
        <div className="mt-0.5 text-xs leading-relaxed">
          <span className="text-text/40">Inv. Save </span>
          <span className="text-text font-medium">{invulnValues.join(' / ')}</span>
        </div>
      )}
    </div>
  )
}

export function UnitView({ roster, unitImages, onImagesChange, attachments = {}, abilityNotes = {}, abilityPhases = {}, commonAbilitiesByUnit = {} }: UnitViewProps) {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)

  const selectUnit = (id: string) => {
    window.history.pushState({ unitDetail: id }, '')
    setSelectedUnitId(id)
  }

  const closeUnit = () => setSelectedUnitId(null)

  useEffect(() => {
    if (!selectedUnitId) return
    const handlePopState = () => setSelectedUnitId(null)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [selectedUnitId])

  // Build inverse map: hostUnitId → leader units attached to it
  const leadersByHost = new Map<string, Unit[]>()
  for (const unit of roster.units) {
    const hostId = attachments[unit.id]
    if (hostId) {
      // add leader unit to host
      const arr = leadersByHost.get(hostId) ?? []
      arr.push(unit)
      leadersByHost.set(hostId, arr)
    }
  }

  // Leaders with an assigned host are rendered inside the host card, not standalone
  const attachedLeaderIds = new Set(
    Object.entries(attachments)
      .filter(([, hostId]) => hostId)
      .map(([leaderId]) => leaderId)
  )

  const topLevelUnits = roster.units.filter(u => !attachedLeaderIds.has(u.id))

  const selectedUnit = selectedUnitId ? roster.units.find(u => u.id === selectedUnitId) : null
  const attachedLeadersForSelected = selectedUnit ? (leadersByHost.get(selectedUnit.id) ?? []) : []

  if (selectedUnit) {
    return (
      <UnitDetail
        unit={selectedUnit}
        attachedUnits={attachedLeadersForSelected}
        unitImages={unitImages}
        onImagesChange={onImagesChange}
        onBack={closeUnit}
        abilityNotes={abilityNotes}
        abilityPhases={abilityPhases}
        commonAbilitiesByUnit={commonAbilitiesByUnit}
      />
    )
  }

  return (
    <div className="space-y-3 pb-20">
      {roster.units.length === 0 ? (
        <p className="text-text2 text-center py-12 text-sm">No units in roster</p>
      ) : (
        topLevelUnits.map(unit => {
          const attachedLeaders = leadersByHost.get(unit.id) ?? []
          const hasAttachments = attachedLeaders.length > 0

          if (hasAttachments) {
            // Outer wrapper groups host + leaders as separate cards
            return (
              <div key={unit.id} className="bg-surface2/30 rounded-2xl p-1.5 space-y-1.5">
                <UnitCard unit={unit} unitImages={unitImages} onSelect={selectUnit} />
                {attachedLeaders.map(leader => (
                  <UnitCard key={leader.id} unit={leader} unitImages={unitImages} onSelect={selectUnit} />
                ))}
              </div>
            )
          }

          return (
            <UnitCard key={unit.id} unit={unit} unitImages={unitImages} onSelect={selectUnit} />
          )
        })
      )}
    </div>
  )
}

function UnitCard({ unit, unitImages, onSelect }: { unit: Unit; unitImages: Record<string, string>; onSelect: (id: string) => void }) {
  const imageUrl = unitImages[unit.id]
  const unitNameLower = unit.name.toLowerCase()
  const visibleKeywords = unit.keywords.filter(kw => {
    const n = kw.name.toLowerCase()
    return !REDUNDANT_KEYWORDS.has(n)
      && !REDUNDANT_KEYWORD_PREFIXES.some(p => n.startsWith(p))
      && n !== unitNameLower
  })

  return (
    <button
      onClick={() => onSelect(unit.id)}
      className="w-full bg-surface rounded-xl overflow-hidden flex items-stretch text-left focus:outline-none focus:ring-2 focus:ring-accent"
    >
      {/* Left: image */}
      <div className="w-24 flex-shrink-0 self-stretch min-h-[120px] relative">
        {imageUrl ? (
          <img src={imageUrl} alt={unit.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-surface2 flex items-center justify-center">
            <User size={40} className="text-text2 opacity-40" />
          </div>
        )}
      </div>

      {/* Right: content */}
      <div className="flex-1 p-3 min-w-0">
        <h3 className="text-text2 font-bold text-lg leading-tight">{unit.name}</h3>
        <div className="mt-1.5">
          <UnitStatBlock unit={unit} />
        </div>
        {visibleKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {visibleKeywords.map(kw => (
              <span
                key={kw.id}
                className="text-xs bg-surface2 text-accent px-2 py-0.5 rounded-full uppercase font-medium tracking-wide"
              >
                {kw.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}
