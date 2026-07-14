// Common component styles.
// Button variants are described semantically in src/config/ui.config.json
// (shape / size / fill / text) and compiled to Tailwind classes here.
// Every allowed option must appear as a literal class string in the lookup
// tables below — Tailwind's JIT only generates classes it can see in
// scanned files — so add the matching literal when adding a new option.
import uiConfig from '../config/ui.config.json'

const shapeClasses: Record<string, string> = {
  square: 'rounded-none',
  rounded: 'rounded',
  pill: 'rounded-full'
}

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg'
}

// Filled buttons automatically dim to 80% fill on hover.
const fillClasses: Record<string, string> = {
  background: 'bg-background hover:bg-background/80',
  surface: 'bg-surface hover:bg-surface/80',
  surface2: 'bg-surface2 hover:bg-surface2/80',
  accent: 'bg-accent hover:bg-accent/80',
  text: 'bg-text hover:bg-text/80',
  text2: 'bg-text2 hover:bg-text2/80',
  white: 'bg-white hover:bg-white/80'
}

const textColorClasses: Record<string, string> = {
  background: 'text-background',
  surface: 'text-surface',
  surface2: 'text-surface2',
  accent: 'text-accent',
  text: 'text-text',
  text2: 'text-text2',
  white: 'text-white'
}

const hoverTextColorClasses: Record<string, string> = {
  background: 'hover:text-background',
  surface: 'hover:text-surface',
  surface2: 'hover:text-surface2',
  accent: 'hover:text-accent',
  text: 'hover:text-text',
  text2: 'hover:text-text2',
  white: 'hover:text-white'
}

const { buttons } = uiConfig

// Unknown config values fall back to sensible defaults instead of
// silently rendering an unstyled button (same spirit as appIcon()).
const shape = shapeClasses[buttons.shape] ?? shapeClasses.rounded

function filledButton(
  variant: { size: string; fill: string; text: string },
  layout: string
): string {
  const size = sizeClasses[variant.size] ?? sizeClasses.md
  const fill = fillClasses[variant.fill] ?? fillClasses.surface2
  const text = textColorClasses[variant.text] ?? textColorClasses.text
  return [size, fill, text, shape, layout].filter(Boolean).join(' ')
}

export const cardStyles = {
  surface: 'bg-surface p-4 rounded-lg',
  surfaceWithBorder: 'bg-surface p-4 rounded-lg border-l-4',
  surface2: 'bg-surface2/50 rounded-lg',
  text: {
    primary: 'text-text',
    secondary: 'text-text2',
    accent: 'text-accent',
    muted: 'text-text2 text-sm'
  },
  button: {
    primary: filledButton(buttons.primary, 'flex items-center gap-2'),
    // secondary is a compact text-only button, no icon layout
    secondary: filledButton(buttons.secondary, ''),
    accent: filledButton(buttons.accent, 'flex items-center gap-2'),
    icon: [
      textColorClasses[buttons.icon.color] ?? textColorClasses.text2,
      hoverTextColorClasses[buttons.icon.hoverColor] ?? hoverTextColorClasses.accent,
      'flex items-center gap-1'
    ].join(' ')
  },
  markdown: 'prose prose-invert max-w-none'
}
