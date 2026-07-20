import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build identity shown in the UI so a running build can be traced back to
// the branch/commit it was made from. Falls back when git is unavailable
// (e.g. building from a source archive).
function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __GIT_BRANCH__: JSON.stringify(git('rev-parse --abbrev-ref HEAD')),
    __GIT_COMMIT__: JSON.stringify(git('rev-parse --short HEAD')),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    host: true,
    port: 5173
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})
