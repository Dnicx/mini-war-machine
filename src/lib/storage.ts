import type { Roster, Plan, GameState } from '../types/roster'

const ROSTER_KEY = 'wh40k_roster'
const PLAN_KEY = 'wh40k_plan'
const GAME_STATE_KEY = 'wh40k_game_state'

export function saveRoster(roster: Roster): void {
  localStorage.setItem(ROSTER_KEY, JSON.stringify(roster))
}

export function loadRoster(): Roster | null {
  const data = localStorage.getItem(ROSTER_KEY)
  if (!data) return null
  try {
    return JSON.parse(data) as Roster
  } catch {
    return null
  }
}

export function savePlan(plan: Plan): void {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan))
}

export function loadPlan(): Plan | null {
  const data = localStorage.getItem(PLAN_KEY)
  if (!data) return null
  try {
    return JSON.parse(data) as Plan
  } catch {
    return null
  }
}

export function saveGameState(gameState: GameState): void {
  localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState))
}

export function loadGameState(): GameState | null {
  const data = localStorage.getItem(GAME_STATE_KEY)
  if (!data) return null
  try {
    return JSON.parse(data) as GameState
  } catch {
    return null
  }
}

export function clearGameState(): void {
  localStorage.removeItem(GAME_STATE_KEY)
}
