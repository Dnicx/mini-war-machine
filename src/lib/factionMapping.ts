export const FACTION_MAP: Record<string, string> = {
  'Adeptus Astartes': 'space_marines',
  'Orks': 'orks',
  'Death Guard': 'death_guard',
  // Add more mappings as needed
}

export function getStratagemFolderName(faction: string): string | undefined {
  // Handle "super faction - faction - subfaction" structure
  // Extract the middle faction part for mapping
  const parts = faction.split(' - ')
  
  // If we have 3 parts, use the middle one (faction)
  // If we have 2 parts, use the second one (faction)
  // If we have 1 part, use it as is
  const factionPart = parts.length >= 2 ? parts[1] : parts[0]
  
  console.log('DEBUG: Faction parts:', parts, 'Selected faction part:', factionPart)
  
  return FACTION_MAP[factionPart]
}
