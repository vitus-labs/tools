import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { diagnose, stripJsonc } from './diagnose-config.ts'

describe('diagnose (robustness)', () => {
  let dir: string

  const writePkg = (extra: Record<string, unknown> = {}) =>
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'test', type: 'module', ...extra }),
    )

  const missingExt = (issues: ReturnType<typeof diagnose>) =>
    issues.filter((i) => i.message.includes('Missing extension'))

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mcp-diag-'))
    mkdirSync(join(dir, 'src'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('should scan src/lib directories', () => {
    writePkg()
    mkdirSync(join(dir, 'src', 'lib'))
    writeFileSync(
      join(dir, 'src', 'lib', 'a.ts'),
      "import { x } from './nope'\n",
    )
    expect(missingExt(diagnose(dir))).toHaveLength(1)
  })

  it('should scan more than 20 files and cap reported issues', () => {
    writePkg()
    for (let i = 0; i < 25; i++) {
      writeFileSync(join(dir, 'src', `f${i}.ts`), "import a from './bad'\n")
    }
    writeFileSync(
      join(dir, 'src', 'multi.ts'),
      "import a from './one'\nimport b from './two'\nexport * from './three'\n",
    )
    const issues = diagnose(dir).filter(
      (i) =>
        i.message.includes('Missing extension') ||
        i.message.includes('more relative import'),
    )
    // 25 + 3 = 28 findings: 20 reported + one summary line
    expect(issues).toHaveLength(21)
    expect(issues.at(-1)?.message).toContain('8 more')
  })

  it('should report every bad import in a single file', () => {
    writePkg()
    writeFileSync(
      join(dir, 'src', 'multi.ts'),
      "import a from './one'\nimport b from './two'\nexport * from './three'\n",
    )
    expect(missingExt(diagnose(dir))).toHaveLength(3)
  })

  it('should not flag imports with known non-JS extensions', () => {
    writePkg()
    writeFileSync(
      join(dir, 'src', 'a.tsx'),
      [
        "import './style.css'",
        "import data from './data.json'",
        "import { a } from './a.mjs'",
        "import { b } from './b.cjs'",
        "import { c } from './c.tsx'",
        "import raw from './x.svg?raw'",
        "import pkg from 'react'",
        '',
      ].join('\n'),
    )
    expect(missingExt(diagnose(dir))).toHaveLength(0)
  })

  it('should flag side-effect, dynamic and directory imports', () => {
    writePkg()
    writeFileSync(
      join(dir, 'src', 'a.ts'),
      "import './side'\nconst m = import('./dyn')\nexport { z } from '..'\n",
    )
    expect(missingExt(diagnose(dir))).toHaveLength(3)
  })

  it('should ignore .test.tsx and .d.ts files', () => {
    writePkg()
    writeFileSync(join(dir, 'src', 'a.test.tsx'), "import a from './bad'\n")
    writeFileSync(join(dir, 'src', 'types.d.ts'), "import a from './bad'\n")
    expect(missingExt(diagnose(dir))).toHaveLength(0)
  })

  it('should ignore node_modules under src', () => {
    writePkg()
    mkdirSync(join(dir, 'src', 'node_modules'))
    writeFileSync(
      join(dir, 'src', 'node_modules', 'a.ts'),
      "import a from './bad'\n",
    )
    expect(missingExt(diagnose(dir))).toHaveLength(0)
  })

  it('should handle tsconfig with comments and trailing commas', () => {
    writePkg()
    writeFileSync(
      join(dir, 'tsconfig.json'),
      `{
  // base
  "extends": "./other", /* block */
  "compilerOptions": { "paths": { "@/*": ["./src/*"], }, "x": "// not a comment", },
}`,
    )
    const issues = diagnose(dir)
    expect(
      issues.find((i) => i.message.includes('extends "./other"')),
    ).toBeDefined()
  })

  it('should handle array extends', () => {
    writePkg()
    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({
        extends: ['./base.json', '@vitus-labs/tools-typescript/lib'],
      }),
    )
    expect(
      diagnose(dir).find((i) => i.message.includes('tsconfig.json extends')),
    ).toBeUndefined()

    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({ extends: ['./a.json', './b.json'] }),
    )
    expect(
      diagnose(dir).find((i) => i.message.includes('"./a.json", "./b.json"')),
    ).toBeDefined()
  })

  it('should recognise ESLint flat config', () => {
    writePkg()
    writeFileSync(join(dir, 'eslint.config.mjs'), 'export default []')
    const issues = diagnose(dir)
    expect(issues.find((i) => i.message.includes('ESLint'))).toBeDefined()
    expect(issues.find((i) => i.message.includes('No Biome'))).toBeUndefined()
  })

  it('should detect missing favicon and atlas dependencies', () => {
    writePkg({ scripts: { icons: 'vl_favicon', graph: 'vl_atlas' } })
    const messages = diagnose(dir).map((i) => i.message)
    expect(messages.some((m) => m.includes('tools-favicon'))).toBe(true)
    expect(messages.some((m) => m.includes('tools-atlas'))).toBe(true)
  })

  it('should detect missing storybook dependency for vl_stories-monorepo', () => {
    writePkg({ scripts: { s: 'vl_stories-monorepo' } })
    expect(
      diagnose(dir).some((i) => i.message.includes('tools-storybook')),
    ).toBe(true)
  })
})

describe('stripJsonc', () => {
  it('should keep comment-like text inside strings', () => {
    const out = stripJsonc('{"a": "http://x/*y*/", /* c */ "b": [1,2,],}')
    expect(JSON.parse(out)).toEqual({ a: 'http://x/*y*/', b: [1, 2] })
  })

  it('should handle escaped quotes in strings and a BOM', () => {
    const out = stripJsonc('﻿{"a": "q\\"//still", // tail\n}')
    expect(JSON.parse(out)).toEqual({ a: 'q"//still' })
  })
})
