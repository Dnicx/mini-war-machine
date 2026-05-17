import { useState } from 'react'
import { User } from 'lucide-react'
import type { Roster } from '../types/roster'
import { UnitDetail } from './UnitDetail'

interface UnitViewProps {
  roster: Roster
  unitImages: Record<string, string>
  onImagesChange: (images: Record<string, string>) => void
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

export function UnitView({ roster, unitImages, onImagesChange }: UnitViewProps) {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)

  const selectedUnit = selectedUnitId ? roster.units.find(u => u.id === selectedUnitId) : null

  if (selectedUnit) {
    return (
      <UnitDetail
        unit={selectedUnit}
        unitImages={unitImages}
        onImagesChange={onImagesChange}
        onBack={() => setSelectedUnitId(null)}
      />
    )
  }

  return (
    <div className="space-y-3 pb-20">
      {roster.units.length === 0 ? (
        <p className="text-text2 text-center py-12 text-sm">No units in roster</p>
      ) : (
        roster.units.map(unit => {
          const imageUrl = unitImages[unit.id]
          return (
            <button
              key={unit.id}
              onClick={() => setSelectedUnitId(unit.id)}
              className="w-full bg-surface rounded-xl overflow-hidden flex items-stretch text-left focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {/* Left: image */}
              <div className="w-24 flex-shrink-0 self-stretch min-h-[120px]">
                {imageUrl ? (
                  <img src={imageUrl} alt={unit.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-surface2 flex items-center justify-center">
                    <User size={40} className="text-text2 opacity-40" />
                  </div>
                )}
              </div>

              {/* Right: content */}
              <div className="flex-1 p-3 min-w-0">
                <h3 className="text-text2 font-bold text-lg leading-tight">{unit.name}</h3>

                {/* Model stats — merged by identical stat profile */}
                {(() => {
                  const groups = new Map<string, { names: string[]; m: typeof unit.models[0] }>()
                  for (const model of unit.models) {
                    const key = [model.movement, model.toughness, model.save, model.wounds, model.leadership, model.objectiveControl].join('|')
                    const existing = groups.get(key)
                    if (existing) existing.names.push(model.name)
                    else groups.set(key, { names: [model.name], m: model })
                  }
                  const entries = Array.from(groups.values())
                  const showNames = entries.length > 1
                  return (
                    <div className="mt-1.5 space-y-0.5">
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
                  )
                })()}

                {/* Keywords */}
                {(() => {
                  const unitNameLower = unit.name.toLowerCase()
                  const visibleKeywords = unit.keywords.filter(kw => {
                    const n = kw.name.toLowerCase()
                    return !REDUNDANT_KEYWORDS.has(n)
                      && !REDUNDANT_KEYWORD_PREFIXES.some(p => n.startsWith(p))
                      && n !== unitNameLower
                  })
                  return visibleKeywords.length > 0 ? (
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
                  ) : null
                })()}
              </div>
            </button>
          )
        })
      )}
    </div>
  )
}
