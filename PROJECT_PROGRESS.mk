# MiniWarMachine Project Progress

## Project Overview
A Warhammer 40k battle planning and play mode application that parses BattleScribe .ros files and helps players plan their abilities across game phases.

## Completed Features

### 1. Roster Parsing (parseRos.ts)
- ✅ Parse units from BattleScribe .ros XML files
- ✅ Extract abilities from `profile[typeName="Abilities"]`
- ✅ Extract abilities from nested selections (characters, wargear)
- ✅ Extract weapons with Range, Attacks, Damage, AP
- ✅ Extract rules from `profile[typeName="Rules"]`
- ✅ Extract keywords from `categories > category`
- ✅ Support fetching from Yellowscribe API

### 2. Data Structure (types/roster.ts)
- ✅ `Ability` interface with auto-detected and user-defined phases/timings
- ✅ `Rule` interface for unit rules
- ✅ `Keyword` interface for unit keywords
- ✅ `Weapon` interface for weapon stats
- ✅ `Unit` interface containing abilities, rules, keywords, weapons
- ✅ `Roster` interface containing units and army-wide abilities
- ✅ `Plan` interface for saved phase plans
- ✅ `GameState` interface for play mode tracking

### 3. Phase Detection (phaseHeuristics.ts)
- ✅ Auto-detect phases from ability descriptions using regex patterns
- ✅ Auto-detect timing (start, beforeTarget, afterTargeted, end)
- ✅ Detect reactive abilities
- ✅ Detect once-per-battle and once-per-round abilities
- ✅ Console logging for debugging phase detection

### 4. Planning Mode (Planner.tsx)
- ✅ Display army abilities and unit abilities
- ✅ Phase selection checkboxes for each ability
- ✅ Timing dropdown for each ability
- ✅ Notes field for each ability
- ✅ Custom stratagem creation
- ✅ Save/load plans to localStorage
- ✅ Separate display for keywords (read-only)
- ✅ Reactive ability badge

### 5. Play Mode (PlayDashboard.tsx)
- ✅ Display abilities grouped by unit
- ✅ Deduplicate abilities by name within each unit
- ✅ Group reactive abilities by unit
- ✅ Phase navigation (Command, Movement, Shooting, Charge, Fight, Morale)
- ✅ Turn tracking (yours/opponent)
- ✅ Battle round tracking
- ✅ Display abilities grouped by timing within phases
- ✅ Special handling for "Start of Game" and "Start of Battle Round" phases
- ✅ Removed checkbox for marking abilities as used

### 6. Storage (storage.ts)
- ✅ Save/load roster to localStorage
- ✅ Save/load plan to localStorage
- ✅ Save/load game state to localStorage
- ✅ Clear game state function

## Current Status
All core features are implemented and functional. The application can:
1. Import BattleScribe .ros files
2. Parse units, abilities, rules, keywords, and weapons
3. Auto-detect phases and timings from descriptions
4. Allow manual phase/timing planning
5. Save and load plans
6. Play through phases with ability tracking

## Known Limitations
- Phase detection relies on regex patterns - may not catch all abilities
- No UI for viewing/editing rules (they are parsed but not displayed)
- Keywords are read-only in Planner
- No multiplayer/sync features
- No export of plans back to .ros format

---

## Done 
- Add Rules display in Planner and PlayDashboard
- Add ability to manually override auto-detected phases
- Fix detachment rule not extracted
- Fix extract unit's models data. unit can have many model characteristic and not in same selection ( can be in profile and selection > profile)
- Add stratagems to plan mode + play mode
- Fix timing, when None is showing in all timing. Should have to choose one timing. And add during roll.
- bladeguard ws not loaded.
- Add unit list view in playmode
- group melee and range weapon
- in unit list, only show (somewhat) unique keyword and show all keywords in detail. 
- Merge unit's common profile 
- add invul save to unit list
- multi detachment
- stores multiple roster
- go to unit detail from stratagem's view.
- foldable section ( stratagems )
- foldable timing in play view
- add timing to abilities
- All stratagem view
- swipe to change between model, weapons, abilities
- group range and melee regardless of character in attach unit

## Bug

## Future Enhancements (Potential)
- unit detail carousel look a little stuttering
- set different bg color for each stratagems type
- support model with special keyword in phase view ( centurion sergeant have grenade )
- Add roll timing for remind during dice rolling ( e.g. +1 to hit, -1 hit roll )
- Phase tracking to reset stratagems usage
- Add modifier tracker ( separate dice and characteristic modifiers)
- track battleshocked state ( reset by 'new battle round' button )
- Add visual indicators for once-per-battle abilities in play mode ( reset by 'new battle round' button )
- keep track of which units is dead and show only available weapon profile on remainnig model in unit
---
- Add ability to track CP usage
- Add victory point tracking
- Export plans to shareable format
- Improve phase detection patterns based on user feedback
- Add stratagem extraction to app
- Add custom stratagem icon 
- Rephrase stratagems

## Planned Features

### Support Official Warhammer App Exports
Add support for importing rosters exported from the official Warhammer 40k app by parsing .txt exports and enriching unit data from the BSData/wh40k-10e git repository.

**Implementation Steps:**

1. **Add BSData Submodule**
   - Add `https://github.com/BSData/wh40k-10e` as a git submodule
   - Place in `data/wh40k-10e/` directory
   - Update .gitignore to exclude the submodule's .git directory
   - Add submodule initialization instructions to README

2. **Create BSData Parser Module**
   - Create `src/lib/parseBsData.ts` with functions to:
     - Load and parse .cat XML files from the submodule
     - Build an in-memory index mapping unit names to their data
     - Extract abilities, weapons, rules, and keywords from unit profiles
     - Support lazy loading of .cat files (load only needed faction files)
   - Create interface for BSData unit data structure
   - Add caching mechanism to avoid re-parsing the same .cat files

3. **Create Official App Parser**
   - Create `src/lib/parseWarhammerApp.ts` with:
     - `parseWarhammerAppFile(file: File): Promise<Roster>` function
     - Parse army header (name, faction, detachment, points)
     - Parse unit sections (CHARACTERS, DEDICATED TRANSPORTS, OTHER DATASHEETS, ALLIED UNITS)
     - Extract unit names, points, and weapon lists
     - Handle model counts (e.g., "3x Sanguinary Guard")
     - Handle enhancements and upgrades
   - Return a partial Roster with basic unit info (no abilities/rules/keywords yet)

4. **Integrate BSData Lookup**
   - Modify `parseWarhammerAppFile` to:
     - Determine faction from the export header
     - Load corresponding .cat file(s) from BSData submodule
     - For each unit, perform exact name match against BSData units
     - Enrich unit with abilities, weapons, rules, keywords from BSData
     - Handle missing units gracefully (log warning, keep basic unit info)
   - Add faction name mapping (official app names to BSData .cat filenames)

5. **Update ImportScreen UI**
   - Add a third import section: "Upload Warhammer App Export (.txt)"
   - Add file input accepting .txt files
   - Add handler calling `parseWarhammerAppFile`
   - Display appropriate error messages for parsing failures
   - Keep existing Yellowscribe and .ros import methods unchanged

6. **Type Definitions**
   - Add any new types needed for BSData parsing to `src/types/roster.ts` or create `src/types/bsData.ts`
   - Ensure compatibility with existing Roster interface

7. **Testing**
   - Test with the provided Blood Angels sample export
   - Verify unit data enrichment from BSData
   - Test with different factions to ensure faction mapping works
   - Test error handling for missing units or .cat files

**Technical Details:**
- BSData .cat files are XML with `<catalogue>` root, units in `<selectionEntry type="model">`, profiles in `<profiles>`, keywords in `<categoryLinks>`, rules in `<infoLinks>`
- Official app .txt format has header (army name, faction, detachment, points), sections (CHARACTERS, DEDICATED TRANSPORTS, OTHER DATASHEETS, ALLIED UNITS), units with points and indented weapons, model counts with "Nx" prefix, enhancements with "Enhancement:" prefix
- Faction mapping: official app names to BSData .cat filenames (e.g., "Blood Angels" → "Imperium - Adeptus Astartes - Blood Angels.cat")

**Future Enhancements (Low Priority):**
- Fuzzy matching for unit names when exact match fails
- User selection dialog for ambiguous matches
- Progressive loading of BSData files
- Offline support by bundling commonly used .cat files