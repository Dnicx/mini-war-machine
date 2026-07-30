import { describe, it, expect } from 'vitest'
import { migratePlanUnitAbilityIds } from '../src/lib/storage'
import { unitAbilityId } from '../src/lib/unitAbilityId'
import type { Plan, Roster, Unit } from '../src/types/roster'

function unit(id: string, name: string, abilityNames: string[]): Unit {
  return {
    id,
    name,
    points: 0,
    abilities: abilityNames.map(n => ({ id: `${id}-${n}`, name: n, description: '' })),
    rules: [],
    keywords: [],
    models: []
  }
}

function roster(units: Unit[]): Roster {
  return { id: 'r1', name: 'R', faction: 'F', detachments: [], points: 0, units, armyAbilities: [] }
}

function plan(entries: Array<{ abilityId: string; phases?: string[] }>): Plan {
  return {
    rosterId: 'r1',
    phasePlans: entries.map(e => ({
      abilityId: e.abilityId,
      phases: (e.phases ?? []) as Plan['phasePlans'][number]['phases'],
      timing: 'start',
      notes: ''
    })),
    customStratagems: []
  }
}

describe('migratePlanUnitAbilityIds', () => {
  it('rewrites old per-unit ability ids to the shared id', () => {
    const r = roster([unit('xqqgmsf', 'Typhus', ['Leader'])])
    const migrated = migratePlanUnitAbilityIds(plan([{ abilityId: 'xqqgmsf-Leader', phases: ['Fight'] }]), r)
    expect(migrated.phasePlans[0].abilityId).toBe(unitAbilityId('Typhus', 'Leader'))
    expect(migrated.phasePlans[0].phases).toEqual(['Fight'])
  })

  it('leaves army/common/stratagem/custom ids untouched', () => {
    const r = roster([unit('xqqgmsf', 'Typhus', ['Leader'])])
    const p = plan([
      { abilityId: 'army-Verminous Haze' },
      { abilityId: 'common-deep strike' },
      { abilityId: 'custom-123' }
    ])
    const migrated = migratePlanUnitAbilityIds(p, r)
    expect(migrated.phasePlans.map(e => e.abilityId))
      .toEqual(['army-Verminous Haze', 'common-deep strike', 'custom-123'])
  })

  it('collapses same-name units onto one entry, preferring non-empty phases', () => {
    const r = roster([
      unit('drone1', 'Foetid Bloat-drone', ['Hovering Death']),
      unit('drone2', 'Foetid Bloat-drone', ['Hovering Death'])
    ])
    const p = plan([
      { abilityId: 'drone1-Hovering Death', phases: [] },
      { abilityId: 'drone2-Hovering Death', phases: ['Shooting'] }
    ])
    const migrated = migratePlanUnitAbilityIds(p, r)
    expect(migrated.phasePlans).toHaveLength(1)
    expect(migrated.phasePlans[0].abilityId).toBe(unitAbilityId('Foetid Bloat-drone', 'Hovering Death'))
    expect(migrated.phasePlans[0].phases).toEqual(['Shooting'])
  })

  it('keys by ability.id even when unit.id was reassigned (pre-#35 rosters)', () => {
    // Pre-merge rosters set unit.id = `${rosterId}-${name}` but kept each
    // ability's original id, so the plan was keyed by ability.id, not by
    // `${unit.id}-${ability.name}`.
    const misaligned: Unit = {
      id: '66720d97-Adrax Agatone',
      name: 'Adrax Agatone',
      points: 0,
      abilities: [{ id: 'sel9-Unto the Anvil', name: 'Unto the Anvil', description: '' }],
      rules: [], keywords: [], models: []
    }
    const r = roster([misaligned])
    const migrated = migratePlanUnitAbilityIds(
      plan([{ abilityId: 'sel9-Unto the Anvil', phases: ['Fight'] }]), r)
    expect(migrated.phasePlans[0].abilityId).toBe(unitAbilityId('Adrax Agatone', 'Unto the Anvil'))
    expect(migrated.phasePlans[0].phases).toEqual(['Fight'])
  })

  it('returns the same plan object when nothing needs migrating (idempotent)', () => {
    const r = roster([unit('xqqgmsf', 'Typhus', ['Leader'])])
    const already = plan([{ abilityId: unitAbilityId('Typhus', 'Leader'), phases: ['Fight'] }])
    expect(migratePlanUnitAbilityIds(already, r)).toBe(already)
  })
})
