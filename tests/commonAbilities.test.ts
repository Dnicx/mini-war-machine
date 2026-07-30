import { describe, it, expect } from 'vitest'
import { isCommonAbilityRule, commonAbilityId, buildCommonAbilities } from '../src/lib/commonAbilities'
import type { Roster, Unit } from '../src/types/roster'

// Weapon keyword bases as unitWeaponKeywordBases would produce them (values
// already stripped): "Rapid Fire 1" -> "rapid fire", "Anti-Infantry 4+" ->
// "anti-infantry".
const weaponBases = new Set([
  'torrent',
  'devastating wounds',
  'anti-infantry',
  'rapid fire',
  'twin-linked',
  'ignores cover'
])
const armyRules = new Set(['oath of moment'])
const unitAbilities = new Set(['leader', 'invulnerable save'])

describe('isCommonAbilityRule', () => {
  it('keeps leftover core rules', () => {
    expect(isCommonAbilityRule('Deep Strike', unitAbilities, armyRules, weaponBases)).toBe(true)
    expect(isCommonAbilityRule('Deadly Demise', unitAbilities, armyRules, weaponBases)).toBe(true)
    expect(isCommonAbilityRule('Feel No Pain', unitAbilities, armyRules, weaponBases)).toBe(true)
  })

  it('excludes weapon-keyword rules (base-aware)', () => {
    expect(isCommonAbilityRule('Torrent', unitAbilities, armyRules, weaponBases)).toBe(false)
    expect(isCommonAbilityRule('Devastating Wounds', unitAbilities, armyRules, weaponBases)).toBe(false)
    // rule name is the base form of the "Rapid Fire 1" keyword
    expect(isCommonAbilityRule('Rapid Fire', unitAbilities, armyRules, weaponBases)).toBe(false)
    expect(isCommonAbilityRule('Anti-Infantry', unitAbilities, armyRules, weaponBases)).toBe(false)
  })

  it('excludes army rules', () => {
    expect(isCommonAbilityRule('Oath of Moment', unitAbilities, armyRules, weaponBases)).toBe(false)
  })

  it('excludes rules that duplicate a unit ability (e.g. Leader)', () => {
    expect(isCommonAbilityRule('Leader', unitAbilities, armyRules, weaponBases)).toBe(false)
  })

  it('is case- and whitespace-insensitive, and ignores blanks', () => {
    expect(isCommonAbilityRule('  deep   strike ', unitAbilities, armyRules, weaponBases)).toBe(true)
    expect(isCommonAbilityRule('TORRENT', unitAbilities, armyRules, weaponBases)).toBe(false)
    expect(isCommonAbilityRule('', unitAbilities, armyRules, weaponBases)).toBe(false)
  })
})

describe('commonAbilityId groups value variants onto one shared card', () => {
  it('strips dice/plus/inch value tokens from the id', () => {
    const base = commonAbilityId('Deadly Demise')
    expect(commonAbilityId('Deadly Demise D6')).toBe(base)
    expect(commonAbilityId('Deadly Demise D3')).toBe(base)
    expect(commonAbilityId('Feel No Pain 6+')).toBe(commonAbilityId('Feel No Pain 5+'))
    expect(commonAbilityId('Scouts 6"')).toBe(commonAbilityId('Scouts'))
  })

  it('does not collapse genuinely different abilities', () => {
    expect(commonAbilityId('Deep Strike')).not.toBe(commonAbilityId('Deadly Demise'))
  })
})

function unitWithRules(id: string, name: string, ruleNames: string[]): Unit {
  return {
    id,
    name,
    points: 0,
    abilities: [],
    rules: ruleNames.map(n => ({ id: `${id}-rule-${n}`, name: n, description: `${n} text`, sourceUnit: name })),
    keywords: [],
    models: []
  }
}

function roster(units: Unit[]): Roster {
  return { id: 'r', name: 'R', faction: 'F', detachments: [], points: 0, units, armyAbilities: [] }
}

describe('buildCommonAbilities tracks every carrying unit by id', () => {
  it('lists all same-name units that carry a common ability (not just the first)', () => {
    const groups = buildCommonAbilities(roster([
      unitWithRules('w1', 'Tyranid Warriors', ['Feel No Pain 5+']),
      unitWithRules('w2', 'Tyranid Warriors', ['Feel No Pain 5+'])
    ]))
    const fnp = groups.find(g => g.ability.id === commonAbilityId('Feel No Pain'))
    expect(fnp).toBeDefined()
    // Before the fix this collapsed to one name -> one unit id.
    expect(fnp!.unitIds.sort()).toEqual(['w1', 'w2'])
  })

  it('includes differently-named units carrying the same ability', () => {
    const groups = buildCommonAbilities(roster([
      unitWithRules('w1', 'Tyranid Warriors', ['Feel No Pain 5+']),
      unitWithRules('w2', 'Tyranid Warriors', ['Feel No Pain 5+']),
      unitWithRules('t1', 'Termagants', ['Feel No Pain 6+'])
    ]))
    const fnp = groups.find(g => g.ability.id === commonAbilityId('Feel No Pain'))!
    expect(fnp.unitIds.sort()).toEqual(['t1', 'w1', 'w2'])
  })

  it('excludes a same-name unit that does not carry the ability', () => {
    const groups = buildCommonAbilities(roster([
      unitWithRules('w1', 'Tyranid Warriors', ['Feel No Pain 5+']),
      unitWithRules('w2', 'Tyranid Warriors', ['Deep Strike'])
    ]))
    const fnp = groups.find(g => g.ability.id === commonAbilityId('Feel No Pain'))!
    expect(fnp.unitIds).toEqual(['w1'])
  })
})
