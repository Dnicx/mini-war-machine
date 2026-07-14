// Maps semantic action names to lucide icons, driven by the "icons"
// section of ui.config.json so a dev can swap icons without code changes.
// Only key-action icons go through this; decorative chevrons and one-off
// icons stay as direct lucide imports in their components.
import {
  Check, ChevronLeft, Pencil, Play, Plus, Settings, Trash2, Upload, X
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import uiConfig from './ui.config.json'

const availableIcons: Record<string, LucideIcon> = {
  Check, ChevronLeft, Pencil, Play, Plus, Settings, Trash2, Upload, X
}

export type IconAction = keyof typeof uiConfig.icons

// Falls back to Settings so a typo'd icon name in the config still
// renders something clickable instead of crashing.
export function appIcon(action: IconAction): LucideIcon {
  return availableIcons[uiConfig.icons[action]] ?? Settings
}
