import type { Roster, Unit, Ability, Weapon, Rule, Keyword, Model } from '../types/roster'

// Helper function to extract ability from profile
function extractAbilityFromProfile(profile: Element, unitId: string, sourceUnit: string, prefix?: string): Ability | null {
  const abilityName = profile.getAttribute('name')
  if (!abilityName) return null

  const characteristics = profile.querySelectorAll('characteristics > characteristic')
  let description = ''
  characteristics.forEach((char) => {
    const charName = char.getAttribute('name')
    const charValue = char.textContent || ''
    if (charName === 'Description') description = charValue.trim()
  })

  return {
    id: prefix ? `${unitId}-${prefix}-${abilityName}` : `${unitId}-${abilityName}`,
    name: abilityName,
    description,
    sourceUnit
  }
}

// Helper function to extract weapon from profile
function extractWeaponFromProfile(profile: Element): Weapon | null {
  const weaponName = profile.getAttribute('name')
  if (!weaponName) return null

  const characteristics = profile.querySelectorAll('characteristics > characteristic')
  let range = '-'
  let attacks = '-'
  let damage = '-'
  let ap = '-'
  let bs = '-'
  let s = '-'
  const keywords: string[] = []
  // console.log( characteristics.item(0) )

  characteristics.forEach((char) => {
    const charName = char.getAttribute('name')
    const charValue = char.textContent?.trim() || '-'
    if (charName === 'Range') range = charValue
    if (charName === 'A') attacks = charValue
    if (charName === 'BS') bs = charValue
    if (charName === 'S') s = charValue
    if (charName === 'AP') ap = charValue
    if (charName === 'D') damage = charValue
    if (charName === 'Keywords') {
      const keywordValue = charValue.split(',').map(k => k.trim())
      keywords.push(...keywordValue)
    }
    // console.log(`[Weapon] ${weaponName}: ${charName} = ${charValue}`)
  })

  return {
    name: weaponName,
    range,
    attacks,
    damage,
    ap,
    bs,
    s,
    keywords
  }
}

// Helper function to extract rule from profile
function extractRuleFromProfile(profile: Element, idPrefix: string, sourceUnit: string): Rule | null {
  const ruleName = profile.getAttribute('name')
  if (!ruleName) return null

  let description = ''
  description = profile.querySelectorAll('description')[0]?.textContent || ''
  // console.log( ruleName, description)
  return {
    id: `${idPrefix}-rule-${ruleName}`,
    name: ruleName,
    description,
    sourceUnit
  }
}

// Helper function to extract model characteristics from typeName="Unit" profile
function extractModelCharacteristics(profile: Element): {
  movement: string
  toughness: string
  wounds: string
  save: string
  invulnerableSave: string
  leadership: string
  objectiveControl: string
} {
  const characteristics = profile.querySelectorAll('characteristics > characteristic')
  let movement = '-'
  let toughness = '-'
  let wounds = '-'
  let save = '-'
  let invulnerableSave = '-'
  let leadership = '-'
  let objectiveControl = '-'

  characteristics.forEach((char) => {
    const charName = char.getAttribute('name')
    const charValue = char.textContent?.trim() || '-'
    if (charName === 'M') movement = charValue
    if (charName === 'T') toughness = charValue
    if (charName === 'W') wounds = charValue
    if (charName === 'SV') save = charValue
    if (charName === 'Invulnerable Save') invulnerableSave = charValue
    if (charName === 'LD') leadership = charValue
    if (charName === 'OC') objectiveControl = charValue
  })

  return { movement, toughness, wounds, save, invulnerableSave, leadership, objectiveControl }
}

// Helper function to extract weapons from any element (model selection, wargear selection, etc.)
function extractWeaponsFromElement(element: Element): Weapon[] {
  const weapons: Weapon[] = []

  // Extract from typeName="Ranged Weapons"
  const rangedProfiles = element.querySelectorAll('profiles > profile[typeName="Ranged Weapons"]')
  rangedProfiles.forEach((profile) => {
    const weapon = extractWeaponFromProfile(profile)
    if (weapon) weapons.push(weapon)
  })

  // Extract from typeName="Melee Weapons"
  const meleeProfiles = element.querySelectorAll('profiles > profile[typeName="Melee Weapons"]')
  meleeProfiles.forEach((profile) => {
    const weapon = extractWeaponFromProfile(profile)
    if (weapon) {
      // Override range for melee
      weapons.push({ ...weapon, range: 'Melee' })
    }
  })

  return weapons
}

// Extract abilities from a selection
function extractAbilities(selection: Element, unitId: string, unitName: string): Ability[] {
  const abilities: Ability[] = []

  // Extract from profile[typeName="Abilities"]
  const abilityProfiles = selection.querySelectorAll('profiles > profile[typeName="Abilities"]')
  abilityProfiles.forEach((profile) => {
    const ability = extractAbilityFromProfile(profile, unitId, unitName)
    if (ability) abilities.push(ability)
  })

  // Extract from nested selections
  const nestedSelections = selection.querySelectorAll('selections selection')
  nestedSelections.forEach((nested) => {
    const nestedName = nested.getAttribute('name')
    const nestedAbilityProfiles = nested.querySelectorAll('profiles > profile[typeName="Abilities"]')
    nestedAbilityProfiles.forEach((profile) => {
      const ability = extractAbilityFromProfile(profile, unitId, unitName, nestedName)
      if (ability) abilities.push(ability)
    })
  })

  return abilities
}

// Extract keywords from a selection
function extractKeywords(selection: Element, unitId: string, unitName: string): Keyword[] {
  const keywords: Keyword[] = []
  const categories = selection.querySelectorAll(':scope > categories > category')
  categories.forEach((category) => {
    const keywordName = category.getAttribute('name')
    if (keywordName) {
      keywords.push({
        id: `${unitId}-keyword-${keywordName}`,
        name: keywordName,
        sourceUnit: unitName
      })
    }
  })
  return keywords
}

// Extract rules from a selection
function extractRules(selection: Element, unitId: string, unitName: string): Rule[] {
  const rules: Rule[] = []
  const ruleProfiles = selection.querySelectorAll('rules > rule')
  ruleProfiles.forEach((profile) => {
    const rule = extractRuleFromProfile(profile, unitId, unitName)
    if (rule) rules.push(rule)
  })
  return rules
}

// Extract wargear rules from a wargear selection
function extractWargearRules(wargearSelection: Element, modelId: string, modelName: string): Rule[] {
  const rules: Rule[] = []
  const ruleProfiles = wargearSelection.querySelectorAll('profiles > profile[typeName="Rules"]')
  ruleProfiles.forEach((profile) => {
    const rule = extractRuleFromProfile(profile, modelId, modelName)
    if (rule) rules.push(rule)
  })
  return rules
}

// Extract models from a selection
// For type="model" (character units): creates 1 model from the selection's own Unit profile
// For type="unit" (squad units): iterates nested model selections, using parent Unit profile as fallback
function extractModels(unitSelection: Element, unitId: string, unitName: string, isCharacterUnit: boolean): Model[] {
  const models: Model[] = []

  if (isCharacterUnit) {

    const modelProfile = unitSelection.querySelector('profiles > profile[typeName="Unit"]')

    // Character unit: create exactly one model from this selection
    const count = parseInt(unitSelection.getAttribute('number') || '1')
    const modelId = unitSelection.getAttribute('id') || `${unitId}-model`

    // Extract characteristics from the selection's own Unit profile
    let stats = { movement: '-', toughness: '-', wounds: '-', save: '-', invulnerableSave: '-', leadership: '-', objectiveControl: '-' }
    if (modelProfile) {
      stats = extractModelCharacteristics(modelProfile)
    }
    else {
      console.warn( unitName, 'character is missing model profile')
    }

    // Extract weapons from all nested wargear selections
    const wargearSelections = unitSelection.querySelectorAll('selections > selection')
    const modelWeapons: Weapon[] = []
    const modelRules: Rule[] = []

    wargearSelections.forEach((wargear) => {
      modelWeapons.push(...extractWeaponsFromElement(wargear))
      modelRules.push(...extractWargearRules(wargear, modelId, unitName))
    })

    models.push({
      id: modelId,
      name: unitName,
      count,
      ...stats,
      weapons: modelWeapons,
      rules: modelRules
    })
  } else {
    // Squad unit: iterate nested model selections
    const modelSelections = unitSelection.querySelectorAll('selections > selection[type="model"]')

    // get unit profile
    let unitStat = { movement: '-', toughness: '-', wounds: '-', save: '-', invulnerableSave: '-', leadership: '-', objectiveControl: '-' }
    const unitProfile = unitSelection.querySelector(`:scope > profiles > profile[typeName="Unit"]`)

    // extract unit profile
    if (unitProfile) {
      unitStat = extractModelCharacteristics(unitProfile)
    } else{
      console.warn( unitName, 'failed to extract unit stat' )
    }

    modelSelections.forEach((modelSelection) => {
      const modelName = modelSelection.getAttribute('name')
      if (!modelName) return

      const count = parseInt(modelSelection.getAttribute('number') || '1')
      const modelId = modelSelection.getAttribute('id') || `${unitId}-model-${modelName}`

      // Extract characteristics - try model's own Unit profile first, then fallback to parent
      let stats = unitStat
      const modelProfile = modelSelection.querySelector(`profiles > profile[typeName="Unit"]`)
      if (modelProfile) {
        stats = extractModelCharacteristics(modelProfile)
      }
      else {
        // use unit profile
        if (unitProfile)
          console.warn( unitName, modelName,'is using unit profile')
        else
          console.error( unitName, modelName, 'profile is blank')
      }

      // Extract weapons from model's nested wargear selections
      const wargearSelections = modelSelection.querySelectorAll('selections > selection')
      const modelWeapons: Weapon[] = []
      const modelRules: Rule[] = []

      wargearSelections.forEach((wargear) => {
        modelWeapons.push(...extractWeaponsFromElement(wargear))
        modelRules.push(...extractWargearRules(wargear, modelId, modelName))
      })

      models.push({
        id: modelId,
        name: modelName,
        count,
        ...stats,
        weapons: modelWeapons,
        rules: modelRules
      })
    })
  }

  return models
}

// Merge units with the same name
function mergeUnits(units: Unit[], rosterId: string): Unit[] {
  const mergedUnits: Unit[] = []
  const unitsByName = new Map<string, Unit[]>()

  units.forEach(unit => {
    if (!unitsByName.has(unit.name)) {
      unitsByName.set(unit.name, [])
    }
    unitsByName.get(unit.name)!.push(unit)
  })

  unitsByName.forEach((unitsWithSameName, name) => {
    // Deduplicate and combine abilities
    const allAbilities: Ability[] = []
    const abilityNames = new Set<string>()
    unitsWithSameName.forEach(unit => {
      unit.abilities.forEach(ability => {
        if (!abilityNames.has(ability.name)) {
          abilityNames.add(ability.name)
          allAbilities.push(ability)
        }
      })
    })

    // Deduplicate and combine keywords
    const allKeywords: Keyword[] = []
    const keywordNames = new Set<string>()
    unitsWithSameName.forEach(unit => {
      unit.keywords.forEach(keyword => {
        if (!keywordNames.has(keyword.name)) {
          keywordNames.add(keyword.name)
          allKeywords.push(keyword)
        }
      })
    })

    // Deduplicate and combine rules
    const allRules: Rule[] = []
    const ruleNames = new Set<string>()
    unitsWithSameName.forEach(unit => {
      unit.rules.forEach(rule => {
        if (!ruleNames.has(rule.name)) {
          ruleNames.add(rule.name)
          allRules.push(rule)
        }
      })
    })

    // Combine models, summing counts for models with the same name
    const allModels: Model[] = []
    const modelsByName = new Map<string, Model>()
    unitsWithSameName.forEach(unit => {
      unit.models.forEach(model => {
        if (modelsByName.has(model.name)) {
          // Sum the count for existing model
          const existing = modelsByName.get(model.name)!
          existing.count += model.count
        } else {
          // Add new model
          modelsByName.set(model.name, { ...model })
        }
      })
    })
    allModels.push(...Array.from(modelsByName.values()))

    // Sum up points
    const totalPoints = unitsWithSameName.reduce((sum, unit) => sum + unit.points, 0)

    mergedUnits.push({
      id: `${rosterId}-${name}`,
      name,
      points: totalPoints,
      abilities: allAbilities,
      rules: allRules,
      keywords: allKeywords,
      models: allModels
    })
  })

  return mergedUnits
}

// Extract army-wide abilities
function extractArmyAbilities(force: Element): Ability[] {
  const armyAbilities: Ability[] = []
  const sharedRulesSelector = force.querySelector('rules')
  const sharedRules = sharedRulesSelector.querySelectorAll( 'rule' )
  sharedRules.forEach((rule) => {
    const ruleName = rule.getAttribute('name')
    const description = rule.querySelector('description')?.textContent || ''
    if (ruleName) {
      armyAbilities.push({
        id: `army-${ruleName}`,
        name: ruleName,
        description
      })
    }
  })

  // get detachment selection 
  const detachmentSelection = force.querySelector('selections > selection[name="Detachment"]')
  const detachmentRulesSelection = detachmentSelection?.querySelector(
    'selections > selection[group="Detachment"], selections > selection[group="Detachments"]'
  )

  // get rules
  const detachmentRules = detachmentRulesSelection?.querySelector( 'rules' )
  if (detachmentRules) {
    const rules = detachmentRules.querySelectorAll('rule')
    rules.forEach((rule) => {
      const ruleName = rule.getAttribute('name')
      const description = rule.querySelector('description')?.textContent || ''
      if (ruleName) {
        armyAbilities.push({
          id: `army-${ruleName}`,
          name: ruleName,
          description
        })
      }
    })
    
  } else {
    console.error( 'Can\'t find detachment rules' )
  }
  return armyAbilities
}

export async function parseRosFile(file: File, debug: boolean = false): Promise<Roster> {
  const text = await file.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/xml')

  const rosterElement = doc.querySelector('roster')
  if (!rosterElement) {
    throw new Error('Invalid .ros file: no roster element found')
  }

  const rosterName = rosterElement.getAttribute('name') || 'Unknown Roster'
  const rosterId = rosterElement.getAttribute('id') || Date.now().toString()
  const points = parseInt(rosterElement.querySelector('costs > cost')?.getAttribute('value') || '0')

  // Get faction from force
  const force = doc.querySelector('forces > force')
  const faction = force?.getAttribute('catalogueName') || 'Unknown Faction'

  // Get detatchment from force selections
  const detachment = force?.querySelector('selections > selection[name="Detachment"]')
  const detachmentRuleSelection = detachment?.querySelector('selections > selection[group="Detachment"]')
  const detachmentName = detachmentRuleSelection?.getAttribute('name') || 'No Detachment' // we'll use this later when we support detachments stratagems

  // Extract units
  const units: Unit[] = []
  const selectionsEl = force.querySelector('selections')
  const selections = selectionsEl ? Array.from(selectionsEl.querySelectorAll(':scope > selection[from="entry"]')) : []

  selections.forEach((selection) => {
    const name = selection.getAttribute('name')
    const type = selection.getAttribute('type')
    // console.log('unit name:', name, 'type:', type)
    if (!name) return

    // Skip upgrade selections
    if (type === 'upgrade') return

    const unitId = selection.getAttribute('id') || `${rosterId}-${name}`
    const unitPoints = parseInt(selection.querySelector('costs > cost[name="pts"]')?.getAttribute('value') || '0')

    const abilities = extractAbilities(selection, unitId, name)
    const keywords = extractKeywords(selection, unitId, name)
    const rules = extractRules(selection, unitId, name)
    const isCharacterUnit = type === 'model'
    const models = extractModels(selection, unitId, name, isCharacterUnit)

    units.push({
      id: unitId,
      name,
      points: unitPoints,
      abilities,
      rules,
      keywords,
      models
    })
  })

  // Merge units
  const mergedUnits = mergeUnits(units, rosterId)

  // Extract army abilities
  const armyAbilities = extractArmyAbilities(force)

  const roster: Roster = {
    id: rosterId,
    name: rosterName,
    faction,
    detachment: detachmentName,
    points,
    units: mergedUnits,
    armyAbilities
  }

  // Debug: dump roster to JSON file
  if (debug) {
    const json = JSON.stringify(roster, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roster-debug-${rosterId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return roster
}

export async function fetchFromYellowscribe(id: string, debug: boolean = false): Promise<Roster> {
  const response = await fetch(`https://yellowscribe.link/get_army_by_id?id=${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch from Yellowscribe')
  }
  const text = await response.text()

  // Create a File object from the response
  const file = new File([text], 'roster.ros', { type: 'text/xml' })
  return parseRosFile(file, debug)
}
