import { parseStratagemXml } from './parseStratagems'
import type { Stratagem } from '../types/roster'

// Static imports of all stratagem XML files
import coreXml from '../stratagems/core-stratagems.xml?raw'

// Orks
import blitzBrigadeXml from '../stratagems/orks/blitz_brigade-stratagems.xml?raw'
import freebooterKrewXml from '../stratagems/orks/freebooter_krew-stratagems.xml?raw'
import moreDakkaXml from '../stratagems/orks/more_dakka!-stratagems.xml?raw'
import speedwaaaghXml from '../stratagems/orks/speedwaaagh!-stratagems.xml?raw'
import taktikalBrigadeXml from '../stratagems/orks/taktikal_brigade-stratagems.xml?raw'

// Death Guard
import flyblownHostXml from '../stratagems/death_guard/flyblown_host-stratagems.xml?raw'

// Space Marines
import armouredSpeartipXml from '../stratagems/space_marines/armoured_speartip-stratagems.xml?raw'
import bastionTaskForceXml from '../stratagems/space_marines/bastion_task_force-stratagems.xml?raw'
import bladeOfUltramarXml from '../stratagems/space_marines/blade_of_ultramar-stratagems.xml?raw'
import ceramiteSentinelsXml from '../stratagems/space_marines/ceramite_sentinels-stratagems.xml?raw'
import emperorsShieldXml from '../stratagems/space_marines/emperor’s_shield-stratagems.xml?raw'
import forgefathersSeekersXml from '../stratagems/space_marines/forgefather’s_seekers-stratagems.xml?raw'
import hammerOfAverniiXml from '../stratagems/space_marines/hammer_of_avernii-stratagems.xml?raw'
import headhunterTaskForceXml from '../stratagems/space_marines/headhunter_task_force-stratagems.xml?raw'
import librariusConclaveXml from '../stratagems/space_marines/librarius_conclave-stratagems.xml?raw'
import orbitalAssaultForceXml from '../stratagems/space_marines/orbital_assault_force-stratagems.xml?raw'
import reclamationForceXml from '../stratagems/space_marines/reclamation_force-stratagems.xml?raw'
import shadowmarkTalonXml from '../stratagems/space_marines/shadowmark_talon-stratagems.xml?raw'
import spearpointTaskForceXml from '../stratagems/space_marines/spearpoint_task_force-stratagems.xml?raw'

// Parse all XMLs at module load time
const coreStratagems = parseStratagemXml(coreXml)

const detachmentRegistry: Record<string, Record<string, Stratagem[]>> = {
  orks: {
    'blitz_brigade': parseStratagemXml(blitzBrigadeXml),
    'freebooter_krew': parseStratagemXml(freebooterKrewXml),
    'more_dakka': parseStratagemXml(moreDakkaXml),
    'speedwaaagh': parseStratagemXml(speedwaaaghXml),
    'taktikal_brigade': parseStratagemXml(taktikalBrigadeXml)
  },
  death_guard: {
    'flyblown_host': parseStratagemXml(flyblownHostXml)
  },
  space_marines: {
    'armoured_speartip': parseStratagemXml(armouredSpeartipXml),
    'bastion_task_force': parseStratagemXml(bastionTaskForceXml),
    'blade_of_ultramar': parseStratagemXml(bladeOfUltramarXml),
    'ceramite_sentinels': parseStratagemXml(ceramiteSentinelsXml),
    'emperors_shield': parseStratagemXml(emperorsShieldXml),
    'forgefathers_seekers': parseStratagemXml(forgefathersSeekersXml),
    'hammer_of_avernii': parseStratagemXml(hammerOfAverniiXml),
    'headhunter_task_force': parseStratagemXml(headhunterTaskForceXml),
    'librarius_conclave': parseStratagemXml(librariusConclaveXml),
    'orbital_assault_force': parseStratagemXml(orbitalAssaultForceXml),
    'reclamation_force': parseStratagemXml(reclamationForceXml),
    'shadowmark_talon': parseStratagemXml(shadowmarkTalonXml),
    'spearpoint_task_force': parseStratagemXml(spearpointTaskForceXml)
  }
}

export function getCoreStratagems(): Stratagem[] {
  return coreStratagems
}

export function getAvailableDetachments(faction: string): string[] {
  const folder = faction.toLowerCase().replace(/\s+/g, '_')
  const detachments = detachmentRegistry[folder]
  return detachments ? Object.keys(detachments) : []
}

export function getDetachmentStratagems(faction: string, detachment: string): Stratagem[] {
  const folder = faction.toLowerCase().replace(/\s+/g, '_')
  const detachments = detachmentRegistry[folder]
  if (!detachments) return []
  return detachments[detachment] || []
}
