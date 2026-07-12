// Strip generated/roster-specific ids so rosters parsed from different
// exports of the same list can be compared structurally
export function stripIds<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripIds) as T
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      if (key === 'id') continue
      result[key] = stripIds(val)
    }
    return result as T
  }
  return value
}
