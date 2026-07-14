// Common component styles.
// Button variants come from src/config/ui.config.json so their look can be
// changed without touching component code. The classes there are literal
// Tailwind strings scanned by JIT (see tailwind.config.js content) — restart
// the dev server after editing ui.config.json, Tailwind may not hot-rebuild.
import uiConfig from '../config/ui.config.json'

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
  button: uiConfig.buttons,
  markdown: 'prose prose-invert max-w-none'
}
