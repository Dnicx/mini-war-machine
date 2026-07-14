import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { appIcon } from '../config/icons'
import { applyTheme, getThemePresets } from '../lib/theme'
import type { ThemePreset } from '../lib/theme'
import { loadThemeId, saveThemeId } from '../lib/storage'

// Settings gear + dropdown listing the theme presets from src/themes/.
// Self-contained (own state, outside-click handling) so it can later be
// dropped into other headers with a single line.
export function ThemePicker() {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState(() => loadThemeId() ?? 'default')
  const containerRef = useRef<HTMLDivElement>(null)
  const SettingsIcon = appIcon('settings')

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleSelect = (preset: ThemePreset) => {
    applyTheme(preset)
    saveThemeId(preset.id)
    setActiveId(preset.id)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 text-text2 hover:text-accent"
        title="Theme settings"
        aria-label="Theme settings"
      >
        <SettingsIcon size={20} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-56 bg-surface border border-surface2
            rounded-lg shadow-lg z-50 overflow-hidden"
        >
          <div className="px-4 py-2 border-b border-surface2">
            <h3 className="text-xs font-semibold text-text2 uppercase tracking-wider">Theme</h3>
          </div>
          <ul>
            {getThemePresets().map(preset => (
              <li key={preset.id}>
                <button
                  onClick={() => handleSelect(preset)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm
                    text-text hover:bg-surface2/40"
                >
                  <span className="flex gap-1">
                    {['background', 'surface2', 'accent'].map(key => (
                      <span
                        key={key}
                        className="w-3 h-3 rounded-full border border-surface2"
                        style={{ backgroundColor: preset.colors[key] }}
                      />
                    ))}
                  </span>
                  <span className="flex-1">{preset.name}</span>
                  {preset.id === activeId && <Check size={14} className="text-accent" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
