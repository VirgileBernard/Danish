import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

let root = ''

export default defineConfig({
  plugins: [
    {
      name: 'resolve-at-alias',
      configResolved(config) {
        root = config.root
      },
      resolveId(id: string) {
        if (id.startsWith('@/') && root) {
          const rel = id.slice(2)
          const abs = path.join(root, 'src', rel)
          const withExt = path.extname(abs) ? abs : abs + '.ts'
          // Use file:// URL to prevent Vite from stripping the Windows drive letter
          return pathToFileURL(withExt).href
        }
      },
    },
  ],
  test: {
    globals: true,
    environment: 'node',
  },
})
