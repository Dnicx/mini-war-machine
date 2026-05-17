import { useState } from 'react'
import { User } from 'lucide-react'
import type { Roster } from '../types/roster'
import { UnitDetail } from './UnitDetail'

interface UnitViewProps {
  roster: Roster
  unitImages: Record<string, string>
  onImagesChange: (images: Record<string, string>) => void
}

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
              <div className="w-32 flex-shrink-0 self-stretch min-h-[120px]">
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

                {/* Model stats — one line per model type */}
                <div className="mt-1.5 space-y-0.5">
                  {unit.models.map(model => (
                    <div key={model.id} className="text-xs leading-relaxed">
                      <span className="font-semibold text-text">{model.name}</span>
                      <span className="text-text/60">
                        {'  '}M: {model.movement} | T: {model.toughness} | Sv: {model.save} | W: {model.wounds} | Ld: {model.leadership} | OC: {model.objectiveControl}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Keywords */}
                {unit.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {unit.keywords.map(kw => (
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
        })
      )}
    </div>
  )
}
