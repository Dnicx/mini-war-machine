import type { Timing } from '../types/roster'

// Timing values are permanent internal identifiers — persisted plans reference
// them, so they must never be renamed. To change what users see, edit
// TIMING_LABELS; to rename an identifier anyway, keep the old spelling in
// TIMING_ALIASES so existing saved plans keep their overrides.

// Display/iteration order for dropdowns and phase-view sections.
export const TIMINGS: Timing[] = [
  'start',
  'beforeTarget',
  'afterTargeted',
  'beforeExecution',
  'execution',
  'afterExecution',
  'end'
]

export const TIMING_LABELS: Record<Timing, string> = {
  start: 'Start of Phase',
  beforeTarget: 'During Phase (Before Choosing Target)',
  afterTargeted: 'During Phase (After Being Targeted)',
  beforeExecution: 'Before Execution',
  execution: 'Execution',
  afterExecution: 'After Execution',
  end: 'End of Phase'
}

// Historical renames: old persisted value -> current identifier.
const TIMING_ALIASES: Record<string, Timing> = {
  attacking: 'execution',
  'attacking/saving': 'execution'
}

// Map a persisted timing to its current identifier: known values pass
// through, renamed ones follow TIMING_ALIASES, and anything else is dropped
// so the ability falls back to its autoDetectedTiming.
export function normalizeTiming(timing: Timing | undefined): Timing | undefined {
  if (!timing) return undefined
  if (TIMINGS.includes(timing)) return timing
  return TIMING_ALIASES[timing]
}
