import { describe, it, expect } from 'vitest'
import { unitAbilityId, buildUnitAbilities } from '../src/lib/unitAbilityId'
import type { Unit } from '../src/types/roster'

describe('unitAbilityId', () => {
  it('is shared across units that have the same name and ability', () => {
    expect(unitAbilityId('Foetid Bloat-drone', 'Deadly Demise'))
      .toBe(unitAbilityId('Foetid Bloat-drone', 'Deadly Demise'))
  })

  it('is case- and whitespace-insensitive', () => {
    expect(unitAbilityId('  Foetid   Bloat-drone ', 'DEADLY demise'))
      .toBe(unitAbilityId('Foetid Bloat-drone', 'Deadly Demise'))
  })

  it('differs for different unit names or ability names', () => {
    expect(unitAbilityId('Typhus', 'Leader')).not.toBe(unitAbilityId('Lord of Poxes', 'Leader'))
    expect(unitAbilityId('Typhus', 'Leader')).not.toBe(unitAbilityId('Typhus', 'The Destroyer Hive'))
  })

  it('is namespaced away from army/common ids', () => {
    expect(unitAbilityId('Typhus', 'Leader')).toMatch(/^unit-/)
  })
})

function makeUnit(id: string, name: string, abilityNames: string[]): Unit {
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

describe('buildUnitAbilities (same-name units share one planned ability)', () => {
  it('collapses same-name units abilities onto one shared-id entry', () => {
    const built = buildUnitAbilities([
      makeUnit('drone1', 'War Drone', ['Hovering Death']),
      makeUnit('drone2', 'War Drone', ['Hovering Death'])
    ])
    // This is the list the Planner renders and the phase view groups, so the
    // shared ability is planned/shown exactly once across the two units.
    const hovering = built.filter(a => a.name === 'Hovering Death')
    expect(hovering).toHaveLength(1)
    expect(hovering[0].id).toBe(unitAbilityId('War Drone', 'Hovering Death'))
    expect(hovering[0].sourceUnit).toBe('War Drone')
  })

  it('keeps abilities of differently-named units separate', () => {
    const built = buildUnitAbilities([
      makeUnit('typhus', 'Typhus', ['Leader']),
      makeUnit('poxes', 'Lord of Poxes', ['Leader'])
    ])
    expect(built).toHaveLength(2)
    expect(built.map(a => a.id).sort()).toEqual(
      [unitAbilityId('Typhus', 'Leader'), unitAbilityId('Lord of Poxes', 'Leader')].sort()
    )
  })

  it('preserves distinct abilities within same-name units', () => {
    const built = buildUnitAbilities([
      makeUnit('d1', 'War Drone', ['Hover', 'Barrage']),
      makeUnit('d2', 'War Drone', ['Hover'])
    ])
    expect(built.map(a => a.name).sort()).toEqual(['Barrage', 'Hover'])
  })
})
