import { parseStratagemXml } from './parseStratagems'
import type { Stratagem } from '../types/roster'

// Every stratagem XML under src/stratagems/ is picked up automatically at
// build time — dropping a new '<detachment>-stratagems.xml' file into a
// faction folder (or adding core-stratagems.xml) registers it without
// touching this file.
const xmlModules = import.meta.glob('../stratagems/**/*-stratagems.xml', {
  eager: true,
  query: '?raw',
  import: 'default'
}) as Record<string, string>

let coreStratagems: Stratagem[] = []
const detachmentRegistry: Record<string, Record<string, Stratagem[]>> = {}

for (const [path, xml] of Object.entries(xmlModules)) {
  // '../stratagems/core-stratagems.xml' -> faction undefined, name 'core'
  // '../stratagems/space_marines/blade_of_ultramar-stratagems.xml' -> faction 'space_marines'
  const match = path.match(/\.\.\/stratagems\/(?:([^/]+)\/)?([^/]+)-stratagems\.xml$/)
  if (!match) continue
  const [, faction, name] = match
  // Filenames may carry an apostrophe (e.g. "emperor’s_shield") that the
  // registry key drops, matching the faction's existing key convention.
  const key = name.replace(/['’]/g, '')

  if (!faction) {
    if (key === 'core') coreStratagems = parseStratagemXml(xml)
    continue
  }

  const detachments = detachmentRegistry[faction] ??= {}
  detachments[key] = parseStratagemXml(xml)
}

export function getCoreStratagems(): Stratagem[] {
  return coreStratagems
}

// Faction folder names discovered from the stratagem XML files, so callers
// can validate a derived folder name without a second hardcoded list.
export function getKnownFactionFolders(): string[] {
  return Object.keys(detachmentRegistry)
}

export function getAvailableDetachments(faction: string): string[] {
  const folder = faction.toLowerCase().replace(/\s+/g, '_')
  const detachments = detachmentRegistry[folder]
  console.log( 'DEBUG: detachment', detachments )
  return detachments ? Object.keys(detachments) : []
}

export function getDetachmentStratagems(faction: string, detachment: string): Stratagem[] {
  const folder = faction.toLowerCase().replace(/\s+/g, '_')
  const detachments = detachmentRegistry[folder]
  console.log('DEBUG: detachment', detachments )
  if (!detachments) return []
  return detachments[detachment] || []
}
