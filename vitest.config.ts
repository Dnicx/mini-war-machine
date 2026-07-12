import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The parsers rely on browser APIs (DOMParser, File)
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts']
  }
})
