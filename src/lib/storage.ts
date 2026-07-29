import type { Roster, RosterMeta, Plan, PhasePlan, GameState } from '../types/roster'
import { unitAbilityId } from './unitAbilityId'

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

// One-time migration for plans saved before same-name units shared a plan
// entry. Unit abilities used to be keyed by the per-unit selection id
// ("<unitId>-<abilityName>"); they now share a name-based id (unitAbilityId).
// Rewrite any old-style unit-ability ids in a loaded plan to the shared id,
// translating via the roster. Other ids (army-/common-/stratagem-/custom-) are
// left untouched, and the function is a no-op once a plan is migrated. Safe to
// remove after existing plans have been converted.
export function migratePlanUnitAbilityIds(plan: Plan, roster: Roster): Plan {
  const oldToNew = new Map<string, string>()
  for (const unit of roster.units) {
    for (const ability of unit.abilities) {
      // Key by the ability's own id — the value the old plan actually saved.
      // It is not always `${unit.id}-${name}`: rosters imported before same-name
      // units were kept separate reassigned unit.id but left ability.id intact,
      // so the two are misaligned and reconstructing the key would miss them.
      oldToNew.set(ability.id, unitAbilityId(unit.name, ability.name))
    }
  }

  let changed = false
  const translated = plan.phasePlans.map(entry => {
    const newId = oldToNew.get(entry.abilityId)
    if (newId && newId !== entry.abilityId) {
      changed = true
      return { ...entry, abilityId: newId }
    }
    return entry
  })
  if (!changed) return plan

  // Same-name units now collapse onto one id; keep the entry that carries
  // planning data (non-empty phases wins, otherwise the first seen).
  const byId = new Map<string, PhasePlan>()
  for (const entry of translated) {
    const existing = byId.get(entry.abilityId)
    if (!existing) {
      byId.set(entry.abilityId, entry)
    } else if ((existing.phases?.length ?? 0) === 0 && (entry.phases?.length ?? 0) > 0) {
      byId.set(entry.abilityId, entry)
    }
  }
  return { ...plan, phasePlans: Array.from(byId.values()) }
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

// --- Keyword colors ---

// Maps a normalized keyword name (lowercased) to a palette slot index.
// Slots are defined per theme, so the color follows the active theme.
const KEYWORD_COLORS_KEY = 'wh40k_keyword_colors'

// Normalize a keyword name so casing variants share one color assignment.
export const normalizeKeyword = (name: string) => name.toLowerCase().trim()

export function saveKeywordColors(map: Record<string, number>): void {
  localStorage.setItem(KEYWORD_COLORS_KEY, JSON.stringify(map))
}

export function loadKeywordColors(): Record<string, number> {
  const data = localStorage.getItem(KEYWORD_COLORS_KEY)
  if (!data) return {}
  try { return JSON.parse(data) as Record<string, number> } catch { return {} }
}

// --- Theme ---

const THEME_KEY = 'wh40k_theme'

export function loadThemeId(): string | null {
  return localStorage.getItem(THEME_KEY)
}

export function saveThemeId(id: string): void {
  localStorage.setItem(THEME_KEY, id)
}
