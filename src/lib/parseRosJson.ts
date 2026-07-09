import { v4 as uuidv4 } from 'uuid'
import type { Roster, Unit, Ability, Weapon, Rule, Keyword, Model } from '../types/roster'
import { mergeUnits, downloadRosterDebug } from './parseRos'

// Shapes of the New Recruit .json export: a 1:1 mirror of the .ros XML where
// attributes become keys, text content becomes "$text" and child elements
// become arrays. Keys are omitted when the XML element would be empty.
interface JsonCharacteristic {
  name?: string
  $text?: string
}

interface JsonProfile {
  name?: string
  typeName?: string
  characteristics?: JsonCharacteristic[]
}

interface JsonRule {
  name?: string
  description?: string
}

interface JsonCategory {
  name?: string
}

interface JsonCost {
  name?: string
  value?: number | string
}

interface JsonSelection {
  id?: string
  name?: string
  type?: string
  from?: string
  group?: string
  number?: number | string
  costs?: JsonCost[]
  categories?: JsonCategory[]
  rules?: JsonRule[]
  profiles?: JsonProfile[]
  selections?: JsonSelection[]
}

interface JsonForce {
  catalogueName?: string
  rules?: JsonRule[]
  selections?: JsonSelection[]
}

interface JsonRoster {
  name?: string
  costs?: JsonCost[]
  forces?: JsonForce[]
}

// Map a profile's characteristics to { name: value }, defaulting blanks to '-'
function characteristicMap(profile: JsonProfile): Record<string, string> {
  const map: Record<string, string> = {}
  for (const char of profile.characteristics ?? []) {
    if (char.name) map[char.name] = char.$text?.trim() || '-'
  }
  return map
}

// Collect profiles of a given typeName from a selection and all nested
// selections, in document order (own profiles before nested selections)
function collectProfiles(selection: JsonSelection, typeName: string, acc: JsonProfile[] = []): JsonProfile[] {
  for (const profile of selection.profiles ?? []) {
    if (profile.typeName === typeName) acc.push(profile)
  }
  for (const nested of selection.selections ?? []) {
    collectProfiles(nested, typeName, acc)
  }
  return acc
}

// Collect rules from a selection and all nested selections
function collectRules(selection: JsonSelection, acc: JsonRule[] = []): JsonRule[] {
  acc.push(...(selection.rules ?? []))
  for (const nested of selection.selections ?? []) {
    collectRules(nested, acc)
  }
  return acc
}

function extractWeaponFromProfile(profile: JsonProfile): Weapon | null {
  const weaponName = profile.name
  if (!weaponName) return null

  const chars = characteristicMap(profile)
  return {
    name: weaponName,
    range: chars['Range'] ?? '-',
    attacks: chars['A'] ?? '-',
    damage: chars['D'] ?? '-',
    ap: chars['AP'] ?? '-',
    bs: chars['BS'] ?? chars['WS'] ?? '-',
    s: chars['S'] ?? '-',
    // A blank Keywords characteristic yields ['-'], matching the XML parser
    keywords: chars['Keywords'] !== undefined
      ? chars['Keywords'].split(',').map(k => k.trim())
      : []
  }
}

// Extract weapons from a wargear selection (ranged first, then melee,
// matching the XML parser's output order)
function extractWeaponsFromSelection(selection: JsonSelection): Weapon[] {
  const weapons: Weapon[] = []
  collectProfiles(selection, 'Ranged Weapons').forEach((profile) => {
    const weapon = extractWeaponFromProfile(profile)
    if (weapon) weapons.push(weapon)
  })
  collectProfiles(selection, 'Melee Weapons').forEach((profile) => {
    const weapon = extractWeaponFromProfile(profile)
    if (weapon) weapons.push({ ...weapon, range: 'Melee' })
  })
  return weapons
}

// Extract wargear rules from typeName="Rules" profiles of a wargear selection
function extractWargearRules(wargear: JsonSelection, modelId: string, modelName: string): Rule[] {
  const rules: Rule[] = []
  collectProfiles(wargear, 'Rules').forEach((profile) => {
    if (!profile.name) return
    rules.push({
      id: `${modelId}-rule-${profile.name}`,
      name: profile.name,
      description: characteristicMap(profile)['Description'] ?? '',
      sourceUnit: modelName
    })
  })
  return rules
}

function extractModelCharacteristics(profile: JsonProfile): {
  movement: string
  toughness: string
  wounds: string
  save: string
  invulnerableSave: string
  leadership: string
  objectiveControl: string
} {
  const chars = characteristicMap(profile)
  return {
    movement: chars['M'] ?? '-',
    toughness: chars['T'] ?? '-',
    wounds: chars['W'] ?? '-',
    // 10th edition exports use "SV"; 11th edition renamed it to "Sv"
    save: chars['Sv'] ?? chars['SV'] ?? '-',
    // 11th edition moved the invulnerable save into an "InSv" characteristic
    invulnerableSave: chars['InSv'] ?? chars['Invulnerable Save'] ?? '-',
    leadership: chars['LD'] ?? '-',
    objectiveControl: chars['OC'] ?? '-'
  }
}

// 10th edition fallback: invuln lives in an Abilities profile named "Invulnerable Save"
function extractInvulnerableSave(selection: JsonSelection): string {
  for (const profile of selection.profiles ?? []) {
    if (profile.typeName === 'Abilities' && profile.name?.toLowerCase() === 'invulnerable save') {
      const value = characteristicMap(profile)['Description']
      if (value) return value
    }
  }
  return '-'
}

function extractAbilities(selection: JsonSelection, unitId: string, unitName: string): Ability[] {
  const abilities: Ability[] = []
  collectProfiles(selection, 'Abilities').forEach((profile) => {
    if (!profile.name) return
    abilities.push({
      id: `${unitId}-${profile.name}`,
      name: profile.name,
      description: characteristicMap(profile)['Description'] ?? '',
      sourceUnit: unitName
    })
  })
  return abilities
}

function extractKeywords(selection: JsonSelection, unitId: string, unitName: string): Keyword[] {
  const keywords: Keyword[] = []
  for (const category of selection.categories ?? []) {
    if (category.name) {
      keywords.push({
        id: `${unitId}-keyword-${category.name}`,
        name: category.name,
        sourceUnit: unitName
      })
    }
  }
  return keywords
}

function extractRules(selection: JsonSelection, unitId: string, unitName: string): Rule[] {
  const rules: Rule[] = []
  collectRules(selection).forEach((rule) => {
    if (!rule.name) return
    rules.push({
      id: `${unitId}-rule-${rule.name}`,
      name: rule.name,
      description: rule.description?.trim() ?? '',
      sourceUnit: unitName
    })
  })
  return rules
}

// Extract models, mirroring the XML parser: characters (type="model") become a
// single model; squads (type="unit") iterate their nested model selections
function extractModels(unitSelection: JsonSelection, unitId: string, unitName: string, isCharacterUnit: boolean): Model[] {
  const models: Model[] = []
  const blankStats = {
    movement: '-', toughness: '-', wounds: '-', save: '-',
    invulnerableSave: '-', leadership: '-', objectiveControl: '-'
  }

  if (isCharacterUnit) {
    const modelProfile = collectProfiles(unitSelection, 'Unit')[0]
    const count = Number(unitSelection.number ?? 1)
    const modelId = unitSelection.id || `${unitId}-model`

    let stats = { ...blankStats }
    if (modelProfile) {
      stats = extractModelCharacteristics(modelProfile)
    } else {
      console.warn(unitName, 'character is missing model profile')
    }
    if (stats.invulnerableSave === '-') {
      stats.invulnerableSave = extractInvulnerableSave(unitSelection)
    }

    const modelWeapons: Weapon[] = []
    const modelRules: Rule[] = []
    for (const wargear of unitSelection.selections ?? []) {
      modelWeapons.push(...extractWeaponsFromSelection(wargear))
      modelRules.push(...extractWargearRules(wargear, modelId, unitName))
    }

    models.push({
      id: modelId,
      name: unitName,
      count,
      ...stats,
      weapons: modelWeapons,
      rules: modelRules
    })
  } else {
    // Squad: unit-level profile is the stat fallback for models without their own
    let unitStat = { ...blankStats }
    const unitProfile = (unitSelection.profiles ?? []).find(p => p.typeName === 'Unit')
    if (unitProfile) {
      unitStat = extractModelCharacteristics(unitProfile)
    } else {
      console.warn(unitName, 'failed to extract unit stat')
    }

    for (const modelSelection of unitSelection.selections ?? []) {
      if (modelSelection.type !== 'model') continue
      const modelName = modelSelection.name
      if (!modelName) continue

      const count = Number(modelSelection.number ?? 1)
      const modelId = modelSelection.id || `${unitId}-model-${modelName}`

      let stats = { ...unitStat }
      const modelProfile = collectProfiles(modelSelection, 'Unit')[0]
      if (modelProfile) {
        stats = extractModelCharacteristics(modelProfile)
      } else {
        if (unitProfile) console.warn(unitName, modelName, 'is using unit profile')
        else console.error(unitName, modelName, 'profile is blank')
      }
      if (stats.invulnerableSave === '-') {
        const invuln = extractInvulnerableSave(modelSelection)
        stats.invulnerableSave = invuln !== '-' ? invuln : extractInvulnerableSave(unitSelection)
      }

      const modelWeapons: Weapon[] = []
      const modelRules: Rule[] = []
      for (const wargear of modelSelection.selections ?? []) {
        modelWeapons.push(...extractWeaponsFromSelection(wargear))
        modelRules.push(...extractWargearRules(wargear, modelId, modelName))
      }

      models.push({
        id: modelId,
        name: modelName,
        count,
        ...stats,
        weapons: modelWeapons,
        rules: modelRules
      })
    }
  }

  return models
}

// Find the selected detachment inside the "Detachment" configuration selection
function findDetachmentSelection(force: JsonForce): JsonSelection | undefined {
  const detachment = (force.selections ?? []).find(s => s.name === 'Detachment')
  return (detachment?.selections ?? []).find(
    s => s.group === 'Detachment' || s.group === 'Detachments'
  )
}

function extractArmyAbilities(force: JsonForce): Ability[] {
  const armyAbilities: Ability[] = []
  for (const rule of force.rules ?? []) {
    if (rule.name) {
      armyAbilities.push({
        id: `army-${rule.name}`,
        name: rule.name,
        description: rule.description?.trim() ?? ''
      })
    }
  }

  const detachmentRules = findDetachmentSelection(force)?.rules
  if (detachmentRules) {
    for (const rule of detachmentRules) {
      if (rule.name) {
        armyAbilities.push({
          id: `army-${rule.name}`,
          name: rule.name,
          description: rule.description?.trim() ?? ''
        })
      }
    }
  } else {
    console.error('Can\'t find detachment rules')
  }
  return armyAbilities
}

export async function parseRosJsonFile(file: File, debug: boolean = false): Promise<Roster> {
  const text = await file.text()

  let doc: { roster?: JsonRoster }
  try {
    doc = JSON.parse(text)
  } catch {
    throw new Error('Invalid .json file: not valid JSON')
  }

  const rosterJson = doc.roster
  if (!rosterJson) {
    throw new Error('Invalid roster .json file: no roster object found')
  }

  const rosterName = rosterJson.name || 'Unknown Roster'
  const rosterId = uuidv4()
  const points = Number(rosterJson.costs?.[0]?.value ?? 0)

  const force = rosterJson.forces?.[0]
  if (!force) {
    throw new Error('Invalid roster .json file: no force found')
  }
  const faction = force.catalogueName || 'Unknown Faction'
  const detachmentName = findDetachmentSelection(force)?.name || 'No Detachment'

  const units: Unit[] = []
  for (const selection of force.selections ?? []) {
    const name = selection.name
    if (!name) continue
    if (selection.from !== 'entry') continue
    if (selection.type === 'upgrade') continue

    const unitId = selection.id || `${rosterId}-${name}`
    // A unit's cost is spread across its own costs plus nested selections
    // (enhancements, paid wargear), so sum every pts cost in the subtree
    let unitPoints = 0
    const sumPoints = (sel: JsonSelection) => {
      for (const cost of sel.costs ?? []) {
        if (cost.name === 'pts') unitPoints += Number(cost.value ?? 0)
      }
      for (const nested of sel.selections ?? []) sumPoints(nested)
    }
    sumPoints(selection)

    const isCharacterUnit = selection.type === 'model'
    units.push({
      id: unitId,
      name,
      points: unitPoints,
      abilities: extractAbilities(selection, unitId, name),
      rules: extractRules(selection, unitId, name),
      keywords: extractKeywords(selection, unitId, name),
      models: extractModels(selection, unitId, name, isCharacterUnit)
    })
  }

  const roster: Roster = {
    id: rosterId,
    name: rosterName,
    faction,
    detachment: detachmentName,
    points,
    units: mergeUnits(units, rosterId),
    armyAbilities: extractArmyAbilities(force)
  }

  if (debug) {
    downloadRosterDebug(roster)
  }

  return roster
}
