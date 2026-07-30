import { describe, it, expect } from 'vitest'
import { isCommonAbilityRule, commonAbilityId } from '../src/lib/commonAbilities'

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
