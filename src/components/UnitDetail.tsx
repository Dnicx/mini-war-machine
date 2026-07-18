import { useState, useRef } from 'react'
import { ChevronLeft, ChevronDown, ChevronUp, Camera, Swords, Shield, User } from 'lucide-react'
import type { Unit, Model } from '../types/roster'
import { StatTile } from './StatTile'
import { PlayAbilityCard } from './PlayAbilityCard'

// Gesture tuning: deadzone must stay smaller than the commit threshold so the
// axis locks before a swipe can advance a tab
const AXIS_LOCK_DEADZONE = 10 // px moved before we decide horizontal vs vertical
const SWIPE_COMMIT_PX = 50 // px of horizontal drag needed to advance a tab

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
        const key = [weapon.name, weapon.range, weapon.attacks, weapon.bs, weapon.s, weapon.ap, weapon.damage, weapon.keywords.join(',')].join('|')
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

function ModelsSubView({ unit, attachedUnits, collapsedModels, onToggleModel }: {
  unit: Unit
  attachedUnits?: Unit[]
  collapsedModels: Set<string>
  onToggleModel: (id: string) => void
}) {
  const multiModel = unit.models.length > 1

  return (
    <div className="space-y-4">
      {unit.models.map((model: Model) => (
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

  // Carousel drag: content follows the finger, then slides to a tab on release
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [sliding, setSliding] = useState(false)
  const touchStart = useRef({ x: 0, y: 0 })
  // Set once per gesture so a horizontal drag never fights native vertical scroll
  const gestureAxis = useRef<'h' | 'v' | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    gestureAxis.current = null
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStart.current.x
    const dy = e.touches[0].clientY - touchStart.current.y
    if (!gestureAxis.current) {
      if (Math.abs(dx) < AXIS_LOCK_DEADZONE && Math.abs(dy) < AXIS_LOCK_DEADZONE) return
      gestureAxis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      if (gestureAxis.current === 'h') setDragging(true)
    }
    if (gestureAxis.current !== 'h') return
    // Dampen drag at both edges, where there is nothing to swipe to
    const pastEnd = dx < 0 && activeIndex === contentTabs.length - 1
    const pastStart = dx > 0 && activeIndex === 0
    if ( pastEnd || pastStart ) setDragX( dx/3 )
    else setDragX( dx )
  }

  const handleTouchEnd = () => {
    if (gestureAxis.current === 'h' && dragX !== 0) {
      setSliding(true)
      if (dragX < -SWIPE_COMMIT_PX && activeIndex < contentTabs.length - 1) {
        setActiveContent(contentTabs[activeIndex + 1])
      } else if (dragX > SWIPE_COMMIT_PX && activeIndex > 0) {
        setActiveContent(contentTabs[activeIndex - 1])
      }
    }
    setDragX(0)
    setDragging(false)
    gestureAxis.current = null
  }

  const selectTab = (tab: typeof contentTabs[number]) => {
    if (tab !== activeContent) setSliding(true)
    setActiveContent(tab)
  }

  // Inactive panels collapse when idle so the tallest tab does not stretch the page,
  // but must be visible while dragging or sliding for the carousel effect
  const panelClass = (tab: typeof contentTabs[number]) =>
    `w-full flex-shrink-0 ${
      tab === activeContent || dragging || sliding ? '' : 'h-0 overflow-hidden'
    }`

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

  return (
    <div
      // Fill the viewport so swipes on empty space below short content still register
      className="min-h-screen"
      style={{ touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
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

      {/* Scrollable content area: panels sit side by side in a sliding track */}
      <div className="pt-3 pb-20 overflow-hidden">
        <div
          className="flex items-start"
          style={{
            transform: `translateX(calc(${activeIndex * -100}% + ${dragX}px))`,
            transition: dragging ? 'none' : 'transform 200ms ease-out',
          }}
          onTransitionEnd={e => {
            if (e.propertyName === 'transform') setSliding(false)
          }}
        >
          <div className={panelClass('models')}>
            <ModelsSubView unit={unit} attachedUnits={attachedUnits} collapsedModels={collapsedModels} onToggleModel={toggleModel} />
          </div>
          <div className={panelClass('weapons')}>
            <WeaponsSubView unit={unit} attachedUnits={attachedUnits} />
          </div>
          <div className={`${panelClass('abilities')} space-y-2`}>
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
        </div>
      </div>
    </div>
  )
}
