import { Flag, RotateCcw, Crown, Move, Crosshair, Zap, Swords } from 'lucide-react'
import type { Phase } from '../types/roster'

// Shared phase → lucide icon map so the Stratagems view and the unit ability
// cards render the same icon per phase (single source of truth).
export const PHASE_ICONS: Record<Phase, typeof Flag> = {
  'Start of Game': Flag,
  'Start of Battle Round': RotateCcw,
  'Command': Crown,
  'Movement': Move,
  'Shooting': Crosshair,
  'Charge': Zap,
  'Fight': Swords
}
