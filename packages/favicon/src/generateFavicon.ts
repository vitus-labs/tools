import fs from 'node:fs'
import nodePath from 'node:path'
import { VL_CONFIG } from '@vitus-labs/tools-core'
import favicons from 'favicons'
import type { IconSource } from './baseConfig.ts'
import { configuration } from './baseConfig.ts'

const writeFile = (outputDir: string, item: any) => {
  const file = nodePath.join(outputDir, item.name)
  fs.mkdirSync(nodePath.dirname(file), { recursive: true })
  fs.writeFileSync(file, item.contents)
}

const handleSuccess = (outputDir: string, response: any) => {
  console.log('Creating images...')
  response.images.forEach((item: any) => {
    writeFile(outputDir, item)
  })

  console.log('Creating manifests...')
  response.files.forEach((item: any) => {
    writeFile(outputDir, item)
  })
}

// `${base}/${sub}` with exactly one separator; never yields `undefined/...`
const joinUrlPath = (base = '', sub = '') => {
  const joined = [base.replace(/\/+$/, ''), sub.replace(/^\/+/, '')]
    .filter(Boolean)
    .join('/')

  return joined || '/'
}

const resolveConfig = () => {
  const { icons, platforms, path, ...restConfig } =
    VL_CONFIG('favicon').merge(configuration).config
  let sources = icons
  let platformToggles = platforms

  // Backward compatibility: `icons` used to hold the platform toggles object.
  if (icons && typeof icons === 'object' && !Array.isArray(icons)) {
    console.warn(
      '[favicon] `icons` as a platform options object is deprecated - use `platforms` for it, and `icons` for the array of sources.',
    )
    platformToggles = { ...platforms, ...icons }
    sources = []
  }

  if (sources == null) sources = []
  if (!Array.isArray(sources)) {
    throw new Error(
      '[favicon] `icons` must be an array of { input, output, path } entries.',
    )
  }

  return {
    icons: sources as IconSource[],
    options: { ...restConfig, icons: platformToggles },
    basePath: path as string | undefined,
  }
}

const generateFavicons = async () => {
  const { icons, options, basePath } = resolveConfig()

  if (icons.length === 0) {
    console.warn(
      '[favicon] No icon sources configured. Set `favicon.icons` in vl-tools.config.mjs, e.g. [{ input, output, path }].',
    )
    return
  }

  const results = await Promise.allSettled(
    icons.map(async (item) => {
      if (!item || typeof item.input !== 'string' || !item.input) {
        throw new Error('Each `icons` entry requires an `input` path.')
      }
      if (typeof item.output !== 'string' || !item.output) {
        throw new Error(
          `\`icons\` entry "${item.input}" requires an \`output\`.`,
        )
      }

      const inputPath = nodePath.resolve(process.cwd(), item.input)
      const outputDir = nodePath.resolve(process.cwd(), item.output)

      const res = await favicons(inputPath, {
        ...options,
        path: joinUrlPath(basePath, item.path),
      })

      handleSuccess(outputDir, res)
    }),
  )

  const failures = results.filter(
    (r): r is PromiseRejectedResult => r.status === 'rejected',
  )

  if (failures.length > 0) {
    for (const f of failures) {
      console.error(`[favicon] ${f.reason?.message ?? f.reason}`)
    }
    throw new Error(`${failures.length} favicon generation(s) failed`)
  }
}

export { generateFavicons, joinUrlPath }
