import { describe, it, expect, beforeEach } from 'vitest'
import {
  updateRosterInPlace, saveRosterToLibrary, savePlan,
  loadRosterById, loadPlan, loadRostersIndex
} from '../src/lib/storage'
import { unitAbilityId } from '../src/lib/unitAbilityId'
import type { Plan, Roster, Unit } from '../src/types/roster'

// storage.ts is localStorage-backed and vitest runs in the `node` environment,
// so provide the minimal surface it uses.
function installLocalStorageStub(): void {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key)
    }
  })
}

function unit(id: string, name: string, abilityNames: string[]): Unit {
  return {
    id,
    name,
    points: 0,
    abilities: abilityNames.map(n => ({ id: unitAbilityId(name, n), name: n, description: '' })),
    rules: [],
    keywords: [],
    models: []
  }
}

function roster(id: string, name: string, points: number, units: Unit[]): Roster {
  return { id, name, faction: 'F', detachments: [], points, units, armyAbilities: [] }
}

const ROSTER_ID = 'saved-id'

describe('updateRosterInPlace', () => {
  let updated: Roster | null

  beforeEach(() => {
    installLocalStorageStub()

    // The list as the user named it, with a saved correction.
    saveRosterToLibrary(roster(ROSTER_ID, 'Tournament list', 1970, [
      unit('u1', 'Captain', ['Rites'])
    ]))
    const plan: Plan = {
      rosterId: ROSTER_ID,
      phasePlans: [{
        abilityId: unitAbilityId('Captain', 'Rites'),
        phases: ['Command'],
        timing: 'start',
        notes: 'my correction'
      }],
      customStratagems: []
    }
    savePlan(plan, ROSTER_ID)

    // A freshly parsed file: different name (New Recruit's "(1)" copy) and
    // different points/units.
    updated = updateRosterInPlace(ROSTER_ID, roster(
      'file-generated-id', 'kind of meta v7 (1)', 2000,
      [unit('u1', 'Captain', ['Rites']), unit('t1', 'Terminators', ['Deep Strike'])]
    ))
  })

  it('keeps the name the user gave the list', () => {
    expect(updated!.name).toBe('Tournament list')
    expect(loadRosterById(ROSTER_ID)!.name).toBe('Tournament list')
  })

  it('refreshes points and units from the new file', () => {
    const stored = loadRosterById(ROSTER_ID)!
    expect(stored.points).toBe(2000)
    expect(stored.units.map(u => u.name)).toEqual(['Captain', 'Terminators'])
  })

  it('keeps the roster id and replaces the entry instead of duplicating it', () => {
    expect(updated!.id).toBe(ROSTER_ID)
    expect(loadRostersIndex()).toHaveLength(1)
  })

  it('leaves the saved correction in place', () => {
    const saved = loadPlan(ROSTER_ID)!
    const entry = saved.phasePlans.find(p => p.abilityId === unitAbilityId('Captain', 'Rites'))
    expect(entry?.notes).toBe('my correction')
  })

  it('returns null for an unknown roster', () => {
    expect(updateRosterInPlace('does-not-exist', roster('x', 'X', 0, []))).toBeNull()
  })
})
