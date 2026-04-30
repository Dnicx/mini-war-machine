// Common component styles
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
    primary: 'px-4 py-2 bg-surface2 text-text rounded hover:bg-surface2/80 flex items-center gap-2',
    secondary: 'px-3 py-1 bg-surface2 text-text rounded hover:bg-surface2/80 text-sm',
    accent: 'px-4 py-2 bg-accent text-white rounded hover:bg-accent/80 flex items-center gap-2',
    icon: 'text-text2 hover:text-accent flex items-center gap-1'
  },
  markdown: 'prose prose-invert max-w-none'
}
