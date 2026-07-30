import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'

// Number of color slots each theme defines (kw1..kw6). Slot 0 = default look.
const SLOTS = [1, 2, 3, 4, 5, 6]

// Inline styles referencing the theme's CSS vars so pills follow the active
// theme without a re-render (same technique as ThemePicker's swatches).
function slotStyle(slot: number): React.CSSProperties | undefined {
  if (slot <= 0) return undefined
  return {
    backgroundColor: `rgb(var(--color-kw${slot}-bg))`,
    color: `rgb(var(--color-kw${slot}-text))`,
  }
}

const BASE_PILL =
  'text-xs px-2 py-0.5 rounded-full uppercase font-medium tracking-wide'

// A unit-keyword pill that opens a color picker on tap. Rendered as a span
// (not a button) so it stays valid inside UnitView's card <button>.
export function KeywordPill({
  name,
  slot,
  onPick,
}: {
  name: string
  slot: number
  onPick: (slot: number) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        // Stop propagation so tapping a keyword doesn't also open the unit card.
        onClick={e => {
          e.stopPropagation()
          setOpen(true)
        }}
        className={
          slot > 0
            ? `${BASE_PILL} cursor-pointer`
            : `${BASE_PILL} bg-surface2 text-accent cursor-pointer`
        }
        style={slotStyle(slot)}
      >
        {name}
      </span>
      {open && (
        <KeywordColorModal
          name={name}
          slot={slot}
          onPick={s => {
            onPick(s)
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function KeywordColorModal({
  name,
  slot,
  onPick,
  onClose,
}: {
  name: string
  slot: number
  onPick: (slot: number) => void
  onClose: () => void
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-surface2 rounded-lg shadow-lg w-full max-w-xs"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-surface2">
          <h3 className="flex-1 text-sm font-semibold text-text uppercase tracking-wide">
            {name}
          </h3>
          <button onClick={onClose} className="p-1 text-text2 hover:text-accent" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 grid grid-cols-4 gap-3">
          {/* Slot 0 = default (unset) */}
          <SwatchButton
            active={slot === 0}
            style={undefined}
            className="bg-surface2"
            label="Default color"
            onClick={() => onPick(0)}
          />
          {SLOTS.map(s => (
            <SwatchButton
              key={s}
              active={slot === s}
              style={slotStyle(s)}
              label={`Color ${s}`}
              onClick={() => onPick(s)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SwatchButton({
  active,
  style,
  className,
  label,
  onClick,
}: {
  active: boolean
  style?: React.CSSProperties
  className?: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`h-9 rounded-lg border border-surface2 flex items-center
        justify-center ${className ?? ''}`}
      style={style}
    >
      {active && <Check size={16} />}
    </button>
  )
}
