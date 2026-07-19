import { useState, useRef } from 'react'
import { ChevronLeft, ChevronDown, ChevronUp, Camera, Swords, Shield, User } from 'lucide-react'
import { useCarouselDrag } from '../hooks/useCarouselDrag'
import type { CarouselSide } from '../hooks/useCarouselDrag'
import type { Unit, Model } from '../types/roster'
import { StatTile } from './StatTile'
import { PlayAbilityCard } from './PlayAbilityCard'

interface UnitDetailProps {
  unit: Unit
  attachedUnits?: Unit[]
  unitImages: Record<string, string>
  onImagesChange: (images: Record<string, string>) => void
  onBack: () => void
}

function resizeImage(file: File, maxPx: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target!.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

type MergedWeapon = {
  weapon: Unit['models'][0]['weapons'][0]
  count: number
  // model name -> how many of that model carry this weapon, to show attribution
  carriers: Map<string, number>
}

function UnitWeaponsBlock({ units }: { units: Unit[] }) {
  const mergedMap = new Map<string, MergedWeapon>()

  // Merge weapons across the host unit and any attached leaders so identical
  // weapons (same name AND same stats) share one row under a single
  // Ranged/Melee section, while carriers records which models hold them.
  for (const unit of units) {
    for (const model of unit.models) {
      for (const weapon of model.weapons) {
        const key = [
          weapon.name,
          weapon.range,
          weapon.attacks,
          weapon.bs,
          weapon.s,
          weapon.ap,
          weapon.damage,
          weapon.keywords.join(','),
        ].join('|')
        const existing = mergedMap.get(key)
        if (existing) {
          existing.count += model.count
          existing.carriers.set(model.name, (existing.carriers.get(model.name) ?? 0) + model.count)
        } else {
          mergedMap.set(key, {
            weapon,
            count: model.count,
            carriers: new Map([[model.name, model.count]]),
          })
        }
      }
    }
  }

  const all = Array.from(mergedMap.values())
  const ranged = all.filter(({ weapon }) => weapon.range.toLowerCase() !== 'melee')
  const melee = all.filter(({ weapon }) => weapon.range.toLowerCase() === 'melee')

  if (all.length === 0) return null

  // Skip the carriers line when there is only one model type — attribution is obvious.
  const multiModel = units.reduce((total, unit) => total + unit.models.length, 0) > 1

  const renderWeapon = ({ weapon, count, carriers }: MergedWeapon, i: number) => (
    <div key={i} className="bg-surface rounded-lg p-3">
      <div className="flex items-baseline gap-2 mb-2">
        <p className="text-text text-sm font-semibold">{weapon.name}</p>
        <span className="text-xs font-semibold text-accent">×{count}</span>
      </div>
      {multiModel && (
        <p className="text-xs text-text2 mb-2">
          {Array.from(carriers, ([name, n]) => `${name} ×${n}`).join(', ')}
        </p>
      )}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <StatTile label="Range" value={weapon.range} />
        <StatTile label="A" value={weapon.attacks} />
        <StatTile label="BS/WS" value={weapon.bs} />
        <StatTile label="S" value={weapon.s} />
        <StatTile label="AP" value={weapon.ap} />
        <StatTile label="D" value={weapon.damage} />
      </div>
      {weapon.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {weapon.keywords.map(kw => (
            <span key={kw} className="text-xs bg-surface2 text-text2 px-2 py-0.5 rounded-full">{kw}</span>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      {ranged.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text2 uppercase tracking-wider">Ranged</p>
          {ranged.map(renderWeapon)}
        </div>
      )}
      {melee.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text2 uppercase tracking-wider">Melee</p>
          {melee.map(renderWeapon)}
        </div>
      )}
    </div>
  )
}

function WeaponsSubView({ unit, attachedUnits }: { unit: Unit; attachedUnits?: Unit[] }) {
  const hasHostWeapons = unit.models.some(m => m.weapons.length > 0)
  const hasAnyWeapons = hasHostWeapons || attachedUnits?.some(u => u.models.some(m => m.weapons.length > 0))

  if (!hasAnyWeapons) {
    return <p className="text-text2 text-sm italic">No weapons</p>
  }

  return <UnitWeaponsBlock units={[unit, ...(attachedUnits ?? [])]} />
}

function ModelBlock({ model, showName, collapsedModels, onToggleModel }: {
  model: Model
  showName: boolean
  collapsedModels: Set<string>
  onToggleModel: (id: string) => void
}) {
  return (
    <div>
      {showName && (
        <button
          onClick={() => onToggleModel(model.id)}
          className="flex items-center gap-2 mb-3 text-sm font-semibold text-text hover:text-accent transition-colors"
        >
          {collapsedModels.has(model.id) ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          {model.name}
          <span className="text-text2 text-xs font-normal">×{model.count}</span>
        </button>
      )}
      {!collapsedModels.has(model.id) && (
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="M" value={model.movement} />
          <StatTile label="T" value={model.toughness} />
          <StatTile label="W" value={model.wounds} />
          <StatTile label="SV" value={model.save} />
          <StatTile label="LD" value={model.leadership} />
          <StatTile label="OC" value={model.objectiveControl} />
        </div>
      )}
    </div>
  )
}

// Merge models whose stat lines are identical (e.g. a sergeant sharing the
// troops' profile) so they render as one block. Only applied to the host
// unit's own models — attached leader units are listed separately and kept
// distinct even when their stats happen to match.
function mergeIdenticalModels(models: Model[]): Model[] {
  const merged = new Map<string, Model>()
  for (const model of models) {
    const key = [
      model.movement,
      model.toughness,
      model.wounds,
      model.save,
      model.invulnerableSave,
      model.leadership,
      model.objectiveControl,
    ].join('|')
    const existing = merged.get(key)
    if (existing) {
      existing.count += model.count
      if (!existing.name.split(', ').includes(model.name)) existing.name += `, ${model.name}`
      // Composite id keeps the collapse toggle stable for the merged block.
      existing.id += `|${model.id}`
    } else {
      merged.set(key, { ...model })
    }
  }
  return Array.from(merged.values())
}

function ModelsSubView({ unit, attachedUnits, collapsedModels, onToggleModel }: {
  unit: Unit
  attachedUnits?: Unit[]
  collapsedModels: Set<string>
  onToggleModel: (id: string) => void
}) {
  const hostModels = mergeIdenticalModels(unit.models)
  const multiModel = hostModels.length > 1

  return (
    <div className="space-y-4">
      {hostModels.map((model: Model) => (
        <ModelBlock
          key={model.id}
          model={model}
          showName={multiModel}
          collapsedModels={collapsedModels}
          onToggleModel={onToggleModel}
        />
      ))}
      {attachedUnits?.map(leader => (
        <div key={leader.id} className="pt-4 border-t border-surface2/50">
          <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-3">Leader: {leader.name}</p>
          {leader.models.map(model => (
            <ModelBlock
              key={model.id}
              model={model}
              showName={leader.models.length > 1}
              collapsedModels={collapsedModels}
              onToggleModel={onToggleModel}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function UnitDetail({ unit, attachedUnits, unitImages, onImagesChange, onBack }: UnitDetailProps) {
  const [activeContent, setActiveContent] = useState<'models' | 'weapons' | 'abilities'>('models')
  const [collapsedModels, setCollapsedModels] = useState<Set<string>>(new Set())
  const imageInputRef = useRef<HTMLInputElement>(null)

  const contentTabs = ['models', 'weapons', 'abilities'] as const
  const activeIndex = contentTabs.indexOf(activeContent)

  // The pane sliding in during a drag or programmatic slide. Rendered
  // offset by ±100% inside the track; null when the carousel is at rest.
  const [incomingTab, setIncomingTab] =
    useState<{ tab: typeof contentTabs[number]; side: CarouselSide } | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)

  // Tabs do not wrap around: past the first/last tab there is no pane, so
  // onDragSide returns false and the hook dampens the drag instead.
  const adjacentTab = (side: CarouselSide) =>
    contentTabs[activeIndex + (side === 'right' ? 1 : -1)] ?? null

  const { handlers: swipeHandlers, slide } = useCarouselDrag(trackRef, {
    onDragSide: (side) => {
      const tab = adjacentTab(side)
      setIncomingTab(tab ? { tab, side } : null)
      return tab !== null
    },
    onSettle: (committed) => {
      if (committed && incomingTab) setActiveContent(incomingTab.tab)
      setIncomingTab(null)
    }
  })

  // Tab buttons reuse the same track animation as finger drags.
  const selectTab = (tab: typeof contentTabs[number]) => {
    if (incomingTab || tab === activeContent) return
    const side: CarouselSide = contentTabs.indexOf(tab) > activeIndex ? 'right' : 'left'
    setIncomingTab({ tab, side })
    slide(side)
  }

  const toggleModel = (id: string) => {
    setCollapsedModels(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleImageClick = () => imageInputRef.current?.click()

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await resizeImage(file, 512, 0.7)
      onImagesChange({ ...unitImages, [unit.id]: dataUrl })
    } catch {
      alert('Failed to process image.')
    }
    e.target.value = ''
  }

  const imageUrl = unitImages[unit.id]

  const renderPane = (tab: typeof contentTabs[number]) => {
    if (tab === 'models') {
      return (
        <ModelsSubView
          unit={unit}
          attachedUnits={attachedUnits}
          collapsedModels={collapsedModels}
          onToggleModel={toggleModel}
        />
      )
    }
    if (tab === 'weapons') {
      return <WeaponsSubView unit={unit} attachedUnits={attachedUnits} />
    }
    return (
      <div className="space-y-2">
        {unit.abilities.length === 0 && (!attachedUnits || attachedUnits.length === 0) ? (
          <p className="text-text2 text-sm text-center py-8">No abilities defined for this unit</p>
        ) : (
          <>
            {unit.abilities.map(ability => (
              <PlayAbilityCard key={ability.id} ability={ability} />
            ))}
            {attachedUnits?.map(leader => (
              <div key={leader.id} className="pt-4 border-t border-surface2/50">
                <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Leader: {leader.name}</p>
                {leader.abilities.map(ability => (
                  <PlayAbilityCard key={ability.id} ability={ability} />
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    )
  }

  return (
    <div
      // Fill the viewport so swipes on empty space below short content still register
      className="min-h-screen"
      style={{ touchAction: 'pan-y' }}
      {...swipeHandlers}
    >
      {/* Sticky floating header */}
      <div className="sticky top-0 z-20 bg-background pt-1 pb-2">
        {/* Row 1: back arrow + image + unit name */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onBack}
            className="p-1 text-text2 hover:text-accent flex-shrink-0 transition-colors"
            aria-label="Back to unit list"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="relative cursor-pointer flex-shrink-0" onClick={handleImageClick}>
            {imageUrl ? (
              <img src={imageUrl} alt={unit.name} className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-surface2 flex items-center justify-center">
                <User size={20} className="text-text2 opacity-50" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 bg-background/80 rounded-full p-0.5">
              <Camera size={10} className="text-text2" />
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          <h2 className="text-lg font-bold text-text flex-1 min-w-0 leading-tight">{unit.name}</h2>
        </div>

        {/* Row 2: keywords */}
        {unit.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {unit.keywords.map(kw => (
              <span key={kw.id} className="text-xs bg-surface2 text-accent px-2 py-0.5 rounded-full uppercase font-medium tracking-wide">{kw.name}</span>
            ))}
          </div>
        )}

        {/* Row 3: nav tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => selectTab('models')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeContent === 'models' ? 'bg-accent text-white' : 'bg-surface2 text-text'
            }`}
          >
            <User size={14} />
            Models
          </button>
          <button
            onClick={() => selectTab('weapons')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeContent === 'weapons' ? 'bg-accent text-white' : 'bg-surface2 text-text'
            }`}
          >
            <Swords size={14} />
            Weapons
          </button>
          <button
            onClick={() => selectTab('abilities')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeContent === 'abilities' ? 'bg-accent text-white' : 'bg-surface2 text-text'
            }`}
          >
            <Shield size={14} />
            Abilities
          </button>
        </div>
      </div>

      {/* Draggable content area. The track's translateX follows the finger
          (written by useCarouselDrag); the incoming pane sits offset by
          ±100% so it slides in as the track moves. */}
      <div className="pt-3 pb-20 overflow-hidden">
        {/* select-none: long-pressing selectable ability text makes Android
            hijack the touch (touchcancel), killing the swipe. */}
        <div ref={trackRef} className="select-none" style={{ position: 'relative' }}>
          {incomingTab && (
            <div
              style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                transform: incomingTab.side === 'right'
                  ? 'translateX(100%)' : 'translateX(-100%)'
              }}
            >
              {renderPane(incomingTab.tab)}
            </div>
          )}
          {renderPane(activeContent)}
        </div>
      </div>
    </div>
  )
}
