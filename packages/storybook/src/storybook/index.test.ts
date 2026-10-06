import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../config/index.ts', () => ({
  CONFIG: { port: 6006, outDir: '/out' },
}))

import { storybookBuild, storybookStandalone } from './index.ts'

describe('storybook runner options', () => {
  it('resolves configDir as a decoded filesystem path', () => {
    const expected = fileURLToPath(new URL('.', import.meta.url))
    expect(storybookStandalone.configDir).toBe(expected.replace(/[\\/]$/, ''))
    expect(storybookBuild.configDir).toBe(storybookStandalone.configDir)
    expect(storybookStandalone.configDir).not.toContain('%')
  })
})
