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

const handleError = (error: any) => {
  console.log(error.message) // Error description e.g. "An unknown error has occurred"
}

const generateFavicons = () =>
  Promise.all(
    icons.map((item: any) => {
      const inputPath = `${process.cwd()}/${item.input}`
      const outputPath = `${process.cwd()}/${item.output}/`

      return favicons(inputPath, {
        ...restConfig,
        path: `${path}/${item.path}`,
      }).then(
        (res) => handleSuccess(outputPath, res),
        (err) => handleError(err),
      )
    }),
  )

export { generateFavicons }
