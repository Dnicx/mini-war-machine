import type { Roster, RosterMeta, Plan, GameState } from '../types/roster'

const ROSTERS_KEY = 'wh40k_rosters'
const PLANS_KEY = 'wh40k_plans'
const GAME_STATE_KEY = 'wh40k_game_state'
const ACTIVE_ROSTER_KEY = 'wh40k_active_roster_id'

// --- Roster library ---

function loadAllRosters(): Roster[] {
  const data = localStorage.getItem(ROSTERS_KEY)
  if (!data) return []
  try {
    const rosters = JSON.parse(data) as Roster[]
    // Migrate rosters saved before multi-detachment support,
    // which stored a single `detachment` string
    return rosters.map(r => {
      if (r.detachments) return r
      const legacy = (r as Roster & { detachment?: string }).detachment
      return { ...r, detachments: legacy ? [legacy] : [] }
    })
  } catch { return [] }
}

function saveAllRosters(rosters: Roster[]): void {
  localStorage.setItem(ROSTERS_KEY, JSON.stringify(rosters))
}

export function loadRostersIndex(): RosterMeta[] {
  return loadAllRosters().map(r => ({
    id: r.id,
    name: r.name,
    faction: r.faction,
    detachments: r.detachments,
    points: r.points,
    lastUsed: (r as Roster & { lastUsed?: number }).lastUsed ?? 0
  }))
}

export function saveRosterToLibrary(roster: Roster): void {
  const rosters = loadAllRosters()
  const idx = rosters.findIndex(r => r.id === roster.id)
  const entry = { ...roster, lastUsed: Date.now() }
  if (idx >= 0) {
    rosters[idx] = entry
  } else {
    rosters.push(entry)
  }
  saveAllRosters(rosters)
}

export function loadRosterById(id: string): Roster | null {
  return loadAllRosters().find(r => r.id === id) ?? null
}

export function deleteRosterFromLibrary(id: string): void {
  saveAllRosters(loadAllRosters().filter(r => r.id !== id))
  const plans = loadAllPlans()
  delete plans[id]
  saveAllPlans(plans)
  if (localStorage.getItem(ACTIVE_ROSTER_KEY) === id) {
    localStorage.removeItem(ACTIVE_ROSTER_KEY)
  }
}

export function renameRoster(id: string, newName: string): void {
  const rosters = loadAllRosters()
  const roster = rosters.find(r => r.id === id)
  if (roster) {
    roster.name = newName
    saveAllRosters(rosters)
  }
}

// --- Active roster ---

export function getActiveRosterId(): string | null {
  return localStorage.getItem(ACTIVE_ROSTER_KEY)
}

export function setActiveRosterId(id: string): void {
  localStorage.setItem(ACTIVE_ROSTER_KEY, id)
  const rosters = loadAllRosters()
  const roster = rosters.find(r => r.id === id)
  if (roster) {
    (roster as Roster & { lastUsed: number }).lastUsed = Date.now()
    saveAllRosters(rosters)
  }
}

export function clearActiveRosterId(): void {
  localStorage.removeItem(ACTIVE_ROSTER_KEY)
}

// --- Plans ---

function loadAllPlans(): Record<string, Plan> {
  const data = localStorage.getItem(PLANS_KEY)
  if (!data) return {}
  try { return JSON.parse(data) as Record<string, Plan> } catch { return {} }
}

function saveAllPlans(plans: Record<string, Plan>): void {
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans))
}

export function savePlan(plan: Plan, rosterId: string, debug: boolean = false): void {
  const plans = loadAllPlans()
  plans[rosterId] = plan
  saveAllPlans(plans)

  if (debug) {
    const json = JSON.stringify(plan, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plan-debug-${plan.rosterId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export function loadPlan(rosterId: string): Plan | null {
  return loadAllPlans()[rosterId] ?? null
}

export function clearPlan(rosterId: string): void {
  const plans = loadAllPlans()
  delete plans[rosterId]
  saveAllPlans(plans)
}

// --- Game state ---

export function saveGameState(gameState: GameState): void {
  localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState))
}

export function loadGameState(): GameState | null {
  const data = localStorage.getItem(GAME_STATE_KEY)
  if (!data) return null
  try { return JSON.parse(data) as GameState } catch { return null }
}

export function clearGameState(): void {
  localStorage.removeItem(GAME_STATE_KEY)
}

// --- Unit images ---

const UNIT_IMAGES_KEY = 'wh40k_unit_images'

export function saveUnitImages(images: Record<string, string>): void {
  try {
    localStorage.setItem(UNIT_IMAGES_KEY, JSON.stringify(images))
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      alert('Storage full — could not save image. Try removing other unit images first.')
    }
  }
}

export function loadUnitImages(): Record<string, string> {
  const data = localStorage.getItem(UNIT_IMAGES_KEY)
  if (!data) return {}
  try { return JSON.parse(data) as Record<string, string> } catch { return {} }
}
