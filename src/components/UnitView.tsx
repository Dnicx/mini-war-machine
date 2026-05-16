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
    <div className="overflow-y-auto pb-20">
      {roster.units.length === 0 ? (
        <p className="text-text2 text-center py-12 text-sm">No units in roster</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {roster.units.map(unit => {
            const imageUrl = unitImages[unit.id]
            return (
              <button
                key={unit.id}
                onClick={() => setSelectedUnitId(unit.id)}
                className="bg-surface rounded-xl p-2 flex flex-col items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={unit.name}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full aspect-square bg-surface2 rounded-lg flex items-center justify-center">
                    <User size={40} className="text-text2" />
                  </div>
                )}
                <span className="text-text text-xs font-medium text-center line-clamp-2 w-full px-1">
                  {unit.name}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
