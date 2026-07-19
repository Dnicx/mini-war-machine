import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The JSON parser only needs File, which Node provides natively.
    // The XML parser (parseRos.ts) needs a browser DOMParser and is untested.
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
