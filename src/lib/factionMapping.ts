import { getKnownFactionFolders } from './stratagemRegistry'

// Only non-derivable aliases live here: factions whose in-game name differs
// from the stratagem folder name. Factions whose folder is just the
// lowercased, underscore-joined name (orks, death_guard, tyranids) are
// derived automatically and need no entry.
const FACTION_ALIASES: Record<string, string> = {
  'Adeptus Astartes': 'space_marines',
  // Add more aliases as needed
}

export function getStratagemFolderName(faction: string): string | undefined {
  // Handle "super faction - faction - subfaction" structure
  // Extract the middle faction part for mapping
  const parts = faction.split(' - ')

  // If we have 3 parts, use the middle one (faction)
  // If we have 2 parts, use the second one (faction)
  // If we have 1 part, use it as is
  const factionPart = parts.length >= 2 ? parts[1] : parts[0]

  // Explicit alias wins; otherwise derive the folder from the faction name
  // and accept it only if the registry actually has stratagems for it.
  const alias = FACTION_ALIASES[factionPart]
  if (alias) return alias

  const derived = factionPart.toLowerCase().replace(/\s+/g, '_')
  return getKnownFactionFolders().includes(derived) ? derived : undefined
}
