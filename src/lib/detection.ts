export function normalizeDetachmentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w-]/g, '') // Remove special characters except underscores and hyphens
}

export function detectDetachment(rosterDetachment: string, available: string[]): string | undefined {
  const normalized = normalizeDetachmentName(rosterDetachment)
  
  // Try exact match first
  if (available.includes(normalized)) {
    return normalized
  }
  
  // Try partial match (e.g., "blitz_brigade" matches "blitz_brigade-stratagems")
  const partialMatch = available.find(det => det.startsWith(normalized))
  if (partialMatch) {
    return partialMatch
  }
  
  // No match found
  return undefined
}
