import { useEffect } from 'react'
import { User, X } from 'lucide-react'
import type { FocusUnit } from '../lib/unitFocus'

interface UnitFocusSheetProps {
  focusUnits: FocusUnit[]
  unitImages: Record<string, string>
  focusedKey: string | null
  onSelect: (key: string) => void
  onClose: () => void
}

// Bottom sheet listing every unit for the phase view's unit focus filter.
export function UnitFocusSheet({
  focusUnits, unitImages, focusedKey, onSelect, onClose
}: UnitFocusSheetProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // The sheet renders inside the phase view, whose root carries the phase
  // swipe handlers; React touch events bubble there, so scrolling or tapping
  // the sheet would otherwise drag the phase carousel.
  const stopTouch = (e: React.TouchEvent) => e.stopPropagation()

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60"
      onClick={onClose}
      onTouchStart={stopTouch}
      onTouchMove={stopTouch}
      onTouchEnd={stopTouch}
    >
      <div
        className="bg-surface border-t border-surface2 rounded-t-2xl w-full max-h-[70vh]
          flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-surface2">
          <h3 className="flex-1 text-sm font-semibold text-text">Focus unit</h3>
          <button onClick={onClose} className="p-1 text-text2 hover:text-accent" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-3 grid grid-cols-3 gap-2">
          {focusUnits.map(focusUnit => {
            const image = unitImages[focusUnit.imageUnitId]
            const isFocused = focusUnit.key === focusedKey
            return (
              <button
                key={focusUnit.key}
                onClick={() => onSelect(focusUnit.key)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs text-center
                  ${isFocused ? 'bg-accent/20 text-accent' : 'bg-surface2 text-text'}`}
              >
                {image ? (
                  <img src={image} alt="" className="w-14 h-14 rounded object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded bg-surface3 flex items-center justify-center">
                    <User size={24} className="text-text2" />
                  </div>
                )}
                <span className="leading-tight break-words">{focusUnit.key}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
