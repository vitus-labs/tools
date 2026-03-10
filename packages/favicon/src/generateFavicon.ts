import fs from 'node:fs'
import { VL_CONFIG } from '@vitus-labs/tools-core'
import favicons from 'favicons'
import { configuration } from './baseConfig.js'

const { icons, path, ...restConfig } =
  VL_CONFIG('favicon').merge(configuration).config

const handleSuccess = (outputPath: string, response: any) => {
  console.log('Creating images...')
  response.images.forEach((item: any) => {
    fs.writeFileSync(`${outputPath}${item.name}`, item.contents)
  })

  console.log('Creating manifests...')
  response.files.forEach((item: any) => {
    fs.writeFileSync(`${outputPath}${item.name}`, item.contents)
  })
}

const generateFavicons = async () => {
  const results = await Promise.allSettled(
    icons.map((item: any) => {
      const inputPath = `${process.cwd()}/${item.input}`
      const outputPath = `${process.cwd()}/${item.output}/`

      return favicons(inputPath, {
        ...restConfig,
        path: `${path}/${item.path}`,
      }).then((res) => handleSuccess(outputPath, res))
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

export { generateFavicons }
