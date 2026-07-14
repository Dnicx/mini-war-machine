import uiConfig from '../config/ui.config.json'
import { loadThemeId } from './storage'

export interface ThemePreset {
  id: string
  name: string
  colors: Record<string, string>
}

// Drop a .json file into src/themes/ to add a preset — no code changes.
const themeModules = import.meta.glob('../themes/*.json', { eager: true })

const presets: ThemePreset[] = Object.values(themeModules)
  .map(m => (m as { default: ThemePreset }).default)
  .sort((a, b) => (a.id === 'default' ? -1 : b.id === 'default' ? 1 : a.name.localeCompare(b.name)))

export function getThemePresets(): ThemePreset[] {
  return presets
}

export function getThemePreset(id: string): ThemePreset | undefined {
  return presets.find(p => p.id === id)
}

// Tailwind colors are declared as rgb(var(--color-x) / <alpha-value>),
// so the variables must hold raw RGB channels, e.g. "94 173 49".
function hexToChannels(hex: string): string | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return null
  const value = parseInt(match[1], 16)
  return `${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255}`
}

export function applyTheme(preset: ThemePreset): void {
  const root = document.documentElement
  for (const [key, hex] of Object.entries(preset.colors)) {
    const channels = hexToChannels(hex)
    if (channels) root.style.setProperty(`--color-${key}`, channels)
  }
}

export function applyUiTypography(): void {
  const root = document.documentElement
  const { fontFamily, baseFontSizePx } = uiConfig.typography
  root.style.setProperty('--app-font-family', fontFamily)
  root.style.setProperty('--app-font-size', `${baseFontSizePx}px`)
}

// Called once at startup, before React renders, so there is no
// flash of the default theme when another preset is persisted.
export function initTheme(): void {
  const savedId = loadThemeId()
  const preset = (savedId && getThemePreset(savedId)) || getThemePreset('default')
  if (preset) applyTheme(preset)
  applyUiTypography()
}
