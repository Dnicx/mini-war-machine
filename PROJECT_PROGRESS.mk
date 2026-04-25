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

## Future Enhancements (Potential)
- Add Rules display in Planner and PlayDashboard
- Improve phase detection patterns based on user feedback
- Add ability to manually override auto-detected phases
- Export plans to shareable format
- Add visual indicators for once-per-battle abilities in play mode
- Add ability to track CP usage
- Add victory point tracking
